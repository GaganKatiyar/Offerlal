using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// The navigation write API.
///
/// Menus have been data-driven since the navigation work — the header, footer
/// and mega menu all read them — but there were no write endpoints at all, only
/// two GETs and a seeder. Editing a menu meant SQL.
/// </summary>
[ApiController]
[Route("api/admin/nav")]
[Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
public class NavigationAdminController(OfferlalFashionDbContext db) : ControllerBase
{
    /// <summary>
    /// The depth the mega menu can actually draw: tab, column group, link.
    ///
    /// Enforced on the SERVER, not just hidden in the UI. A menu is a fixed
    /// visual shape, and an admin must not be able to save a tree the storefront
    /// cannot render — that failure would surface as a silently missing link.
    /// </summary>
    private const int MaxDepth = 3;

    /// <summary>Menus with their full trees, INCLUDING inactive and scheduled items.</summary>
    [HttpGet("menus")]
    public async Task<ActionResult<IReadOnlyList<AdminNavMenuDto>>> GetMenus(CancellationToken ct = default)
    {
        var menus = await db.NavMenus.AsNoTracking().OrderBy(m => m.Code).ToListAsync(ct);
        // Column first, THEN order within it.
        //
        // DisplayOrder restarts at 10 inside each mega-menu column, so ordering
        // by it alone interleaves the columns and the admin tree reads as a
        // shuffled list rather than three groups.
        var items = await db.NavItems.AsNoTracking()
            .Include(i => i.Category)
            .Include(i => i.Occasion)
            .OrderBy(i => i.ColumnIndex)
            .ThenBy(i => i.DisplayOrder)
            .ToListAsync(ct);

        var byParent = items.ToLookup(i => i.ParentId);

        AdminNavItemDto Build(NavItem item) => new()
        {
            Id = item.Id,
            ParentId = item.ParentId,
            Label = item.Label,
            Url = item.Url,
            CategoryId = item.CategoryId,
            CategoryName = item.Category?.Name,
            OccasionId = item.OccasionId,
            OccasionName = item.Occasion?.Name,
            IconName = item.IconName,
            ColumnIndex = item.ColumnIndex,
            DisplayOrder = item.DisplayOrder,
            IsActive = item.IsActive,
            IsHighlighted = item.IsHighlighted,
            BadgeText = item.BadgeText,
            StartsAtUtc = item.StartsAtUtc,
            EndsAtUtc = item.EndsAtUtc,
            ResolvedUrl = ResolveUrl(item),
            Children = [.. byParent[item.Id].Select(Build)],
        };

        return Ok(menus.Select(m => new AdminNavMenuDto
        {
            Id = m.Id,
            Code = m.Code,
            Name = m.Name,
            Items = [.. items.Where(i => i.MenuId == m.Id && i.ParentId is null).Select(Build)],
        }).ToList());
    }

    [HttpPost("{code}/items")]
    public async Task<ActionResult<AdminNavItemDto>> Create(string code, [FromBody] NavItemWrite request, CancellationToken ct = default)
    {
        var menu = await db.NavMenus.FirstOrDefaultAsync(m => m.Code == code, ct);
        if (menu is null) return NotFound($"Unknown menu '{code}'.");

        if (request.ParentId is not null)
        {
            // The NEW item sits one level below its parent, so the check is
            // against the child's depth. `>=` here rejected a legitimate third
            // level, which is the deepest the mega menu actually draws.
            var depth = await DepthOfAsync(request.ParentId.Value, ct);
            if (depth + 1 > MaxDepth)
            {
                return BadRequest(new { message = $"Navigation is limited to {MaxDepth} levels." });
            }
        }

        var siblings = await db.NavItems
            .Where(i => i.MenuId == menu.Id && i.ParentId == request.ParentId)
            .Select(i => i.DisplayOrder)
            .ToListAsync(ct);

        var item = new NavItem
        {
            MenuId = menu.Id,
            ParentId = request.ParentId,
            // Renumbered in tens so a later insert has room without renumbering
            // the whole list, matching the homepage editor's convention.
            DisplayOrder = (siblings.DefaultIfEmpty(0).Max() / 10 + 1) * 10,
        };

        Apply(item, request);
        db.NavItems.Add(item);
        await db.SaveChangesAsync(ct);

        return Ok(await ToDtoAsync(item.Id, ct));
    }

    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<AdminNavItemDto>> Update(int id, [FromBody] NavItemWrite request, CancellationToken ct = default)
    {
        var item = await db.NavItems.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return NotFound();

        Apply(item, request);
        await db.SaveChangesAsync(ct);

        return Ok(await ToDtoAsync(item.Id, ct));
    }

    /// <summary>
    /// Applies the whole tree's order and parentage in one request.
    ///
    /// One call, not one per item, for the same reason the homepage editor saves
    /// its whole section list at once: a reorder changes every sibling's
    /// position, and N requests leave the menu half-reordered when one fails.
    /// </summary>
    [HttpPut("{code}/reorder")]
    public async Task<ActionResult<object>> Reorder(string code, [FromBody] ReorderRequest request, CancellationToken ct = default)
    {
        var menu = await db.NavMenus.FirstOrDefaultAsync(m => m.Code == code, ct);
        if (menu is null) return NotFound($"Unknown menu '{code}'.");

        var items = await db.NavItems.Where(i => i.MenuId == menu.Id).ToDictionaryAsync(i => i.Id, ct);

        // Validate the whole payload BEFORE mutating anything, so a rejected
        // reorder leaves the menu exactly as it was rather than partly applied.
        var proposed = request.Items.ToDictionary(i => i.Id, i => i.ParentId);

        foreach (var entry in request.Items)
        {
            if (!items.ContainsKey(entry.Id))
            {
                return BadRequest(new { message = "The menu changed while you were editing. Reload and try again." });
            }

            if (DepthOfProposed(entry.Id, proposed) > MaxDepth)
            {
                return BadRequest(new { message = $"Navigation is limited to {MaxDepth} levels." });
            }

            if (CreatesCycle(entry.Id, proposed))
            {
                return BadRequest(new { message = "An item cannot be nested inside itself." });
            }
        }

        foreach (var entry in request.Items)
        {
            var item = items[entry.Id];
            item.ParentId = entry.ParentId;
            item.DisplayOrder = entry.DisplayOrder;
            item.ColumnIndex = entry.ColumnIndex;
            item.IsActive = entry.IsActive;
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { updated = request.Items.Count });
    }

    /// <summary>
    /// Deletes an item, refusing while it still has children.
    ///
    /// The parent FK is NoAction — SQL Server rejects a self-referencing cascade
    /// because it cannot prove the delete terminates — so cascading here would
    /// have to be hand-rolled. Refusing is also the safer behaviour: silently
    /// deleting a tab's whole column of links is not what "delete" looks like
    /// from the admin's side.
    /// </summary>
    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var item = await db.NavItems.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return NotFound();

        var childCount = await db.NavItems.CountAsync(i => i.ParentId == id, ct);
        if (childCount > 0)
        {
            return Conflict(new
            {
                message = $"Remove this item's {childCount} sub-item{(childCount == 1 ? "" : "s")} first.",
            });
        }

        db.NavItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // -----------------------------------------------------------------------

    private static void Apply(NavItem item, NavItemWrite request)
    {
        item.Label = request.Label.Trim();
        item.ColumnIndex = request.ColumnIndex;
        item.IsActive = request.IsActive;
        item.IsHighlighted = request.IsHighlighted;
        item.BadgeText = Blank(request.BadgeText);
        item.IconName = Blank(request.IconName);
        item.StartsAtUtc = request.StartsAtUtc;
        item.EndsAtUtc = request.EndsAtUtc;

        // Exactly one link target. Setting a category AND a url would leave the
        // resolver's precedence deciding silently, so the others are cleared.
        item.CategoryId = null;
        item.OccasionId = null;
        item.Url = null;

        switch (request.LinkType)
        {
            case "category": item.CategoryId = Blank(request.CategoryId); break;
            case "occasion": item.OccasionId = Blank(request.OccasionId); break;
            default: item.Url = Blank(request.Url); break;
        }
    }

    private async Task<AdminNavItemDto> ToDtoAsync(int id, CancellationToken ct)
    {
        var item = await db.NavItems.AsNoTracking()
            .Include(i => i.Category)
            .Include(i => i.Occasion)
            .FirstAsync(i => i.Id == id, ct);

        return new AdminNavItemDto
        {
            Id = item.Id,
            ParentId = item.ParentId,
            Label = item.Label,
            Url = item.Url,
            CategoryId = item.CategoryId,
            CategoryName = item.Category?.Name,
            OccasionId = item.OccasionId,
            OccasionName = item.Occasion?.Name,
            IconName = item.IconName,
            ColumnIndex = item.ColumnIndex,
            DisplayOrder = item.DisplayOrder,
            IsActive = item.IsActive,
            IsHighlighted = item.IsHighlighted,
            BadgeText = item.BadgeText,
            StartsAtUtc = item.StartsAtUtc,
            EndsAtUtc = item.EndsAtUtc,
            ResolvedUrl = ResolveUrl(item),
        };
    }

    private async Task<int> DepthOfAsync(int itemId, CancellationToken ct)
    {
        var parents = await db.NavItems.AsNoTracking()
            .Select(i => new { i.Id, i.ParentId })
            .ToDictionaryAsync(i => i.Id, i => i.ParentId, ct);

        var depth = 1;
        var current = itemId;
        while (parents.TryGetValue(current, out var parent) && parent is not null && depth < 20)
        {
            depth++;
            current = parent.Value;
        }
        return depth;
    }

    private static int DepthOfProposed(int itemId, Dictionary<int, int?> parents)
    {
        var depth = 1;
        var current = itemId;
        var guard = 0;
        while (parents.TryGetValue(current, out var parent) && parent is not null && guard++ < 20)
        {
            depth++;
            current = parent.Value;
        }
        return depth;
    }

    private static bool CreatesCycle(int itemId, Dictionary<int, int?> parents)
    {
        var seen = new HashSet<int> { itemId };
        var current = itemId;
        while (parents.TryGetValue(current, out var parent) && parent is not null)
        {
            if (!seen.Add(parent.Value)) return true;
            current = parent.Value;
        }
        return false;
    }

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string ResolveUrl(NavItem item)
    {
        if (item.Category is not null) return $"/category/{item.Category.Slug}";
        if (item.Occasion is not null) return $"/occasion/{item.Occasion.Slug}";
        return item.Url ?? "#";
    }
}

public sealed record AdminNavMenuDto
{
    public int Id { get; init; }
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public IReadOnlyList<AdminNavItemDto> Items { get; init; } = [];
}

public sealed record AdminNavItemDto
{
    public int Id { get; init; }
    public int? ParentId { get; init; }
    public string Label { get; init; } = "";
    public string? Url { get; init; }
    public string? CategoryId { get; init; }
    public string? CategoryName { get; init; }
    public string? OccasionId { get; init; }
    public string? OccasionName { get; init; }
    public string? IconName { get; init; }
    public byte ColumnIndex { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
    public bool IsHighlighted { get; init; }
    public string? BadgeText { get; init; }
    public DateTime? StartsAtUtc { get; init; }
    public DateTime? EndsAtUtc { get; init; }

    /// <summary>Where this item actually points, after category/occasion resolution.</summary>
    public string ResolvedUrl { get; init; } = "#";

    public IReadOnlyList<AdminNavItemDto> Children { get; init; } = [];
}

public sealed record NavItemWrite
{
    public int? ParentId { get; init; }
    public string Label { get; init; } = "";

    /// <summary>category | occasion | url — decides which target field is kept.</summary>
    public string LinkType { get; init; } = "url";

    public string? Url { get; init; }
    public string? CategoryId { get; init; }
    public string? OccasionId { get; init; }
    public string? IconName { get; init; }
    public byte ColumnIndex { get; init; }
    public bool IsActive { get; init; } = true;
    public bool IsHighlighted { get; init; }
    public string? BadgeText { get; init; }
    public DateTime? StartsAtUtc { get; init; }
    public DateTime? EndsAtUtc { get; init; }
}

public sealed record ReorderRequest
{
    public IReadOnlyList<ReorderEntry> Items { get; init; } = [];
}

public sealed record ReorderEntry
{
    public int Id { get; init; }
    public int? ParentId { get; init; }
    public int DisplayOrder { get; init; }
    public byte ColumnIndex { get; init; }
    public bool IsActive { get; init; } = true;
}
