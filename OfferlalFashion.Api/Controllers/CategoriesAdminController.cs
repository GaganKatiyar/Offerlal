using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// The category write API.
///
/// Categories are the spine of the catalogue: the PLP routes by their slug, the
/// navigation tree resolves link URLs from them, and offers scope to them. They
/// have been read-only since the beginning, so adding a category — or fixing a
/// misspelt one — meant SQL against production.
///
/// The awkward part is <see cref="Category.Path"/>. It is a materialised path
/// ("/cat-bridal/cat-heavy/") and it is what makes "this category and all its
/// descendants" a single indexed LIKE rather than a recursive walk;
/// ProductQueryService relies on it for every category-scoped listing. Nothing
/// has ever maintained it: it was written once by the seeder and only ever read.
/// The moment an admin can reparent a category, a stale path stops being
/// theoretical — and it fails silently, as a PLP quietly listing the wrong
/// products, which is exactly the kind of bug nobody reports. So reparenting
/// rewrites the path and level of the moved node AND of every descendant, in the
/// same transaction as the move.
/// </summary>
[ApiController]
[Route("api/admin/categories")]
[Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
public class CategoriesAdminController(OfferlalFashionDbContext db) : ControllerBase
{
    /// <summary>
    /// How deep the tree may nest.
    ///
    /// This is not a taste preference. Path is varchar(400) and ids are up to 50
    /// characters, so a path costs up to 51 bytes per level; four levels is 205
    /// worst case, with room to spare. Silently truncating a path would corrupt
    /// descendant lookups for an entire subtree, so the limit is checked rather
    /// than discovered.
    /// </summary>
    private const int MaxDepth = 4;

    /// <summary>
    /// The whole tree, flat, INCLUDING inactive categories.
    ///
    /// Flat rather than nested: the editor needs to reparent across branches,
    /// and a nested payload would have to be flattened on arrival anyway. The
    /// counts travel with it because they are the reason a delete gets refused —
    /// telling an admin "has 12 products" is more use than "cannot delete".
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminCategoryDto>>> GetAll(CancellationToken ct = default)
    {
        var rows = await Project(
                db.Categories.AsNoTracking()
                    .OrderBy(c => c.Level).ThenBy(c => c.DisplayOrder).ThenBy(c => c.Name))
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpPost]
    public async Task<ActionResult<AdminCategoryDto>> Create([FromBody] CategoryWrite request, CancellationToken ct = default)
    {
        var slug = Slugify(request.Slug ?? request.Name);
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "A name is required." });
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest(new { message = "A slug is required." });

        if (await db.Categories.AnyAsync(c => c.Slug == slug, ct))
        {
            // The storefront routes /category/{slug}. Two rows sharing a slug
            // means one of them is simply unreachable.
            return BadRequest(new { message = $"The slug '{slug}' is already in use." });
        }

        Category? parent = null;
        if (!string.IsNullOrWhiteSpace(request.ParentId))
        {
            parent = await db.Categories.FirstOrDefaultAsync(c => c.Id == request.ParentId, ct);
            if (parent is null) return BadRequest(new { message = "That parent category does not exist." });

            if (parent.Level + 1 >= MaxDepth)
            {
                return BadRequest(new { message = $"Categories are limited to {MaxDepth} levels." });
            }
        }

        var id = await GenerateIdAsync(parent, slug, ct);

        var parentId = parent?.Id;
        var siblings = await db.Categories
            .Where(c => c.ParentId == parentId)
            .Select(c => c.DisplayOrder)
            .ToListAsync(ct);

        var category = new Category
        {
            Id = id,
            Slug = slug,
            ParentId = parent?.Id,
            Level = (byte)((parent?.Level ?? -1) + 1),
            Path = (parent?.Path ?? "/") + id + "/",
            // In tens, so a later insert has room without renumbering the list —
            // the convention the navigation and homepage editors already use.
            DisplayOrder = (siblings.DefaultIfEmpty(0).Max() / 10 + 1) * 10,
        };

        Apply(category, request);
        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);

        return Ok(await ReadOneAsync(category.Id, ct));
    }

    /// <summary>
    /// Updates a category's own fields. Moving it is <see cref="Reorder"/>'s job.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<AdminCategoryDto>> Update(string id, [FromBody] CategoryWrite request, CancellationToken ct = default)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "A name is required." });

        var slug = Slugify(request.Slug ?? request.Name);
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest(new { message = "A slug is required." });

        if (await db.Categories.AnyAsync(c => c.Slug == slug && c.Id != id, ct))
        {
            return BadRequest(new { message = $"The slug '{slug}' is already in use." });
        }

        category.Slug = slug;
        Apply(category, request);
        await db.SaveChangesAsync(ct);

        return Ok(await ReadOneAsync(category.Id, ct));
    }

    /// <summary>
    /// Applies the whole tree's parentage and order in one request.
    ///
    /// One call rather than one per node, for the reason the navigation editor
    /// works the same way: a move changes every sibling's position, and N
    /// requests leave the tree half-rearranged when one of them fails.
    ///
    /// This is also where paths are rebuilt. Doing it here rather than per-node
    /// means the rebuild sees the finished shape of the tree — rebuilding after
    /// each individual move would compute paths from a state that is only
    /// half-applied.
    /// </summary>
    [HttpPut("reorder")]
    public async Task<ActionResult<object>> Reorder([FromBody] CategoryReorderRequest request, CancellationToken ct = default)
    {
        var all = await db.Categories.ToDictionaryAsync(c => c.Id, ct);

        // Validate the entire proposed shape before touching a single row.
        var proposed = new Dictionary<string, string?>();
        foreach (var entry in request.Items)
        {
            if (!all.ContainsKey(entry.Id)) return BadRequest(new { message = $"Unknown category '{entry.Id}'." });
            if (entry.ParentId is not null && !all.ContainsKey(entry.ParentId))
                return BadRequest(new { message = $"Unknown parent '{entry.ParentId}'." });
            proposed[entry.Id] = entry.ParentId;
        }

        // Anything not mentioned keeps the parent it has, or the walk below
        // would read a half-populated map.
        foreach (var (id, c) in all)
        {
            if (!proposed.ContainsKey(id)) proposed[id] = c.ParentId;
        }

        foreach (var id in proposed.Keys)
        {
            var depth = DepthOfProposed(id, proposed);
            if (depth < 0)
            {
                // Dragging a category into its own descendant. Left alone this
                // detaches the whole branch from every root — it would vanish
                // from the storefront rather than error.
                return BadRequest(new { message = "A category cannot be moved inside itself." });
            }
            if (depth > MaxDepth)
            {
                return BadRequest(new { message = $"Categories are limited to {MaxDepth} levels." });
            }
        }

        foreach (var entry in request.Items)
        {
            var c = all[entry.Id];
            c.ParentId = entry.ParentId;
            c.DisplayOrder = entry.DisplayOrder;
        }

        var touched = Rebuild(all);
        await db.SaveChangesAsync(ct);

        // `touched` is worth returning: it is how many rows had their path or
        // level rewritten, which is the number that matters after a move and is
        // usually larger than the number of nodes dragged.
        return Ok(new { moved = request.Items.Count, pathsRewritten = touched });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct = default)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null) return NotFound();

        var children = await db.Categories.CountAsync(c => c.ParentId == id, ct);
        if (children > 0)
        {
            // Cascading would orphan products into a category that no longer
            // exists. Refusing makes the admin decide where they should go.
            return BadRequest(new { message = $"This category has {children} sub-categor{(children == 1 ? "y" : "ies")}. Move or delete them first." });
        }

        var products = await db.Products.CountAsync(p => p.CategoryId == id, ct);
        if (products > 0)
        {
            return BadRequest(new { message = $"This category has {products} product{(products == 1 ? "" : "s")}. Move them first." });
        }

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------------------------------------------------------------- helpers

    private static void Apply(Category c, CategoryWrite r)
    {
        c.Name = r.Name.Trim();
        c.Description = r.Description?.Trim() ?? "";
        c.HeroImageUrl = r.HeroImageUrl?.Trim() ?? "";
        c.HeroImageAssetId = r.HeroImageAssetId;
        c.ThumbnailUrl = r.ThumbnailUrl?.Trim() ?? "";
        c.ThumbnailAssetId = r.ThumbnailAssetId;
        c.SeoTitle = Trimmed(r.SeoTitle);
        c.SeoDescription = Trimmed(r.SeoDescription);
        c.SeoKeywords = Trimmed(r.SeoKeywords);
        c.IsActive = r.IsActive;
    }

    private static string? Trimmed(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    /// <summary>
    /// Rewrites Path and Level for every node whose value is now wrong.
    ///
    /// Walks down from the roots so a parent's path is always final before its
    /// children read it. Returns how many rows actually changed — writing only
    /// what moved keeps an unrelated reorder from touching the whole table.
    /// </summary>
    private static int Rebuild(IReadOnlyDictionary<string, Category> all)
    {
        var byParent = all.Values
            .GroupBy(c => c.ParentId ?? "")
            .ToDictionary(g => g.Key, g => g.ToList());

        var changed = 0;
        var queue = new Queue<(Category Node, string ParentPath, int Level)>();

        if (byParent.TryGetValue("", out var roots))
        {
            foreach (var root in roots) queue.Enqueue((root, "/", 0));
        }

        while (queue.Count > 0)
        {
            var (node, parentPath, level) = queue.Dequeue();

            var path = parentPath + node.Id + "/";
            if (node.Path != path || node.Level != level)
            {
                node.Path = path;
                node.Level = (byte)level;
                changed++;
            }

            if (byParent.TryGetValue(node.Id, out var kids))
            {
                foreach (var kid in kids) queue.Enqueue((kid, path, level + 1));
            }
        }

        return changed;
    }

    /// <summary>
    /// Depth of a node under a proposed parentage, or -1 if it sits in a cycle.
    /// Roots are depth 1, so the result compares directly against MaxDepth.
    /// </summary>
    private static int DepthOfProposed(string id, IReadOnlyDictionary<string, string?> parents)
    {
        var seen = new HashSet<string>();
        var depth = 0;
        string? cursor = id;

        while (cursor is not null)
        {
            if (!seen.Add(cursor)) return -1;
            depth++;
            if (depth > 64) return -1;
            parents.TryGetValue(cursor, out cursor);
        }

        return depth;
    }

    /// <summary>
    /// Builds a readable id in the existing convention ("cat-bridal-lehengas",
    /// "cat-bridal-lehengas-heavy-bridal"): the parent's id plus this slug.
    ///
    /// Ids are 50 characters, and a nested slug can exceed that, so the fallback
    /// is a short suffix rather than a truncation that might collide.
    /// </summary>
    private async Task<string> GenerateIdAsync(Category? parent, string slug, CancellationToken ct)
    {
        var baseId = parent is null ? $"cat-{slug}" : $"{parent.Id}-{slug}";
        if (baseId.Length > 50) baseId = $"cat-{slug}";
        if (baseId.Length > 50) baseId = baseId[..50].TrimEnd('-');

        var candidate = baseId;
        for (var n = 2; await db.Categories.AnyAsync(c => c.Id == candidate, ct); n++)
        {
            var suffix = $"-{n}";
            candidate = baseId.Length + suffix.Length <= 50
                ? baseId + suffix
                : baseId[..(50 - suffix.Length)].TrimEnd('-') + suffix;
        }

        return candidate;
    }

    private static string Slugify(string value)
    {
        var chars = value.Trim().ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-');
        var slug = new string(chars.ToArray());
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        slug = slug.Trim('-');
        return slug.Length > 120 ? slug[..120].TrimEnd('-') : slug;
    }

    private Task<AdminCategoryDto> ReadOneAsync(string id, CancellationToken ct) =>
        Project(db.Categories.AsNoTracking().Where(c => c.Id == id)).FirstAsync(ct);

    /// <summary>The single projection every read path shares.</summary>
    private static IQueryable<AdminCategoryDto> Project(IQueryable<Category> source) =>
        source.Select(c => new AdminCategoryDto
        {
            Id = c.Id,
            Slug = c.Slug,
            Name = c.Name,
            Description = c.Description,
            ParentId = c.ParentId,
            DisplayOrder = c.DisplayOrder,
            Level = c.Level,
            Path = c.Path,
            IsActive = c.IsActive,
            HeroImageUrl = c.HeroImageUrl,
            HeroImageAssetId = c.HeroImageAssetId,
            ThumbnailUrl = c.ThumbnailUrl,
            ThumbnailAssetId = c.ThumbnailAssetId,
            SeoTitle = c.SeoTitle,
            SeoDescription = c.SeoDescription,
            SeoKeywords = c.SeoKeywords,
            ProductCount = c.Products.Count,
            ChildCount = c.InverseParent.Count,
        });
}

public sealed record AdminCategoryDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string Description { get; init; } = "";
    public string? ParentId { get; init; }
    public int DisplayOrder { get; init; }
    public byte Level { get; init; }
    public string Path { get; init; } = "";
    public bool IsActive { get; init; }
    public string HeroImageUrl { get; init; } = "";
    public int? HeroImageAssetId { get; init; }
    public string ThumbnailUrl { get; init; } = "";
    public int? ThumbnailAssetId { get; init; }
    public string? SeoTitle { get; init; }
    public string? SeoDescription { get; init; }
    public string? SeoKeywords { get; init; }
    public int ProductCount { get; init; }
    public int ChildCount { get; init; }
}

public sealed record CategoryWrite
{
    public string Name { get; init; } = "";
    /// <summary>Left null on create, the slug is derived from the name.</summary>
    public string? Slug { get; init; }
    public string? Description { get; init; }
    public string? ParentId { get; init; }
    public string? HeroImageUrl { get; init; }
    public int? HeroImageAssetId { get; init; }
    public string? ThumbnailUrl { get; init; }
    public int? ThumbnailAssetId { get; init; }
    public string? SeoTitle { get; init; }
    public string? SeoDescription { get; init; }
    public string? SeoKeywords { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed record CategoryReorderRequest
{
    public IReadOnlyList<CategoryReorderEntry> Items { get; init; } = [];
}

public sealed record CategoryReorderEntry
{
    public string Id { get; init; } = "";
    public string? ParentId { get; init; }
    public int DisplayOrder { get; init; }
}
