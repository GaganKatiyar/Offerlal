using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// The occasion write API.
///
/// Occasions are a flat list, not a tree, so this is the plain sibling of the
/// category admin: no path to maintain, no depth to cap, no reorder. The two
/// things that do matter are the same, though — a slug is a public URL and a
/// delete must not strand anything that points at it.
/// </summary>
[ApiController]
[Route("api/admin/occasions")]
[Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
public class OccasionsAdminController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminOccasionDto>>> GetAll(CancellationToken ct = default)
        => Ok(await Project(db.Occasions.AsNoTracking().OrderBy(o => o.Name)).ToListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<AdminOccasionDto>> Create([FromBody] OccasionWrite request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "A name is required." });

        var slug = Slugify(request.Slug ?? request.Name);
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest(new { message = "A slug is required." });
        if (await db.Occasions.AnyAsync(o => o.Slug == slug, ct))
            return BadRequest(new { message = $"The slug '{slug}' is already in use." });

        var id = await GenerateIdAsync(slug, ct);

        var occasion = new Occasion { Id = id, Slug = slug };
        Apply(occasion, request);
        db.Occasions.Add(occasion);
        await db.SaveChangesAsync(ct);

        return Ok(await ReadOneAsync(id, ct));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AdminOccasionDto>> Update(string id, [FromBody] OccasionWrite request, CancellationToken ct = default)
    {
        var occasion = await db.Occasions.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (occasion is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "A name is required." });

        var slug = Slugify(request.Slug ?? request.Name);
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest(new { message = "A slug is required." });
        if (await db.Occasions.AnyAsync(o => o.Slug == slug && o.Id != id, ct))
            return BadRequest(new { message = $"The slug '{slug}' is already in use." });

        occasion.Slug = slug;
        Apply(occasion, request);
        await db.SaveChangesAsync(ct);

        return Ok(await ReadOneAsync(id, ct));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct = default)
    {
        var occasion = await db.Occasions
            .Include(o => o.Products)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
        if (occasion is null) return NotFound();

        if (occasion.Products.Count > 0)
        {
            // The join rows would go quietly, taking every "shop by occasion"
            // listing for those products with them.
            return BadRequest(new { message = $"This occasion is used by {occasion.Products.Count} product{(occasion.Products.Count == 1 ? "" : "s")}. Remove it from them first." });
        }

        // A navigation item can point at an occasion, and NavItems.OccasionId has
        // no cascade. Deleting underneath one leaves a menu entry linking nowhere.
        var navUses = await db.NavItems.CountAsync(i => i.OccasionId == id, ct);
        if (navUses > 0)
        {
            return BadRequest(new { message = $"This occasion is linked from {navUses} navigation item{(navUses == 1 ? "" : "s")}. Repoint or remove them first." });
        }

        db.Occasions.Remove(occasion);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------------------------------------------------------------- helpers

    private static void Apply(Occasion o, OccasionWrite r)
    {
        o.Name = r.Name.Trim();
        o.Description = r.Description?.Trim() ?? "";
        o.ImageUrl = r.ImageUrl?.Trim() ?? "";
        o.ImageAssetId = r.ImageAssetId;
    }

    private Task<AdminOccasionDto> ReadOneAsync(string id, CancellationToken ct) =>
        Project(db.Occasions.AsNoTracking().Where(o => o.Id == id)).FirstAsync(ct);

    private static IQueryable<AdminOccasionDto> Project(IQueryable<Occasion> source) =>
        source.Select(o => new AdminOccasionDto
        {
            Id = o.Id,
            Slug = o.Slug,
            Name = o.Name,
            Description = o.Description,
            ImageUrl = o.ImageUrl,
            ImageAssetId = o.ImageAssetId,
            ProductCount = o.Products.Count,
        });

    private async Task<string> GenerateIdAsync(string slug, CancellationToken ct)
    {
        var baseId = $"occ-{slug}";
        if (baseId.Length > 50) baseId = baseId[..50].TrimEnd('-');

        var candidate = baseId;
        for (var n = 2; await db.Occasions.AnyAsync(o => o.Id == candidate, ct); n++)
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
        var slug = new string(value.Trim().ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray());
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        slug = slug.Trim('-');
        return slug.Length > 120 ? slug[..120].TrimEnd('-') : slug;
    }
}

public sealed record AdminOccasionDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string Description { get; init; } = "";
    public string ImageUrl { get; init; } = "";
    public int? ImageAssetId { get; init; }
    public int ProductCount { get; init; }
}

public sealed record OccasionWrite
{
    public string Name { get; init; } = "";
    /// <summary>Left null on create, the slug is derived from the name.</summary>
    public string? Slug { get; init; }
    public string? Description { get; init; }
    public string? ImageUrl { get; init; }
    public int? ImageAssetId { get; init; }
}
