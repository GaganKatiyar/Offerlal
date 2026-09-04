using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OfferlalFashion.Api.Models;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Content;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api")]
public class NavigationController(
    OfferlalFashionDbContext db,
    NavigationSeeder seeder) : ControllerBase
{
    /// <summary>
    /// A menu as a nested tree, in one request.
    ///
    /// Links resolve from the referenced category or occasion's slug rather
    /// than a stored URL wherever possible, so renaming a category updates the
    /// navigation instead of leaving a dead link behind.
    /// </summary>
    [HttpGet("nav/{code}")]
    public async Task<ActionResult<IReadOnlyList<NavItemDto>>> GetMenu(string code, CancellationToken ct = default)
    {
        var menu = await db.NavMenus.AsNoTracking().FirstOrDefaultAsync(m => m.Code == code, ct);
        if (menu is null) return NotFound($"Unknown menu '{code}'.");

        var now = DateTime.UtcNow;

        var items = await db.NavItems.AsNoTracking()
            .Where(i => i.MenuId == menu.Id && i.IsActive)
            .Include(i => i.Category)
            .Include(i => i.Occasion)
            .Include(i => i.MediaAsset)
            .OrderBy(i => i.DisplayOrder)
            .ToListAsync(ct);

        var live = items
            .Where(i => (i.StartsAtUtc is null || i.StartsAtUtc <= now)
                     && (i.EndsAtUtc is null || i.EndsAtUtc > now))
            .ToList();

        var byParent = live.ToLookup(i => i.ParentId);

        NavItemDto Build(Models.NavItem item) => new()
        {
            Id = item.Id,
            Label = item.Label,
            Url = ResolveUrl(item),
            IconName = item.IconName,
            ImageUrl = item.MediaAsset?.Url,
            ColumnIndex = item.ColumnIndex,
            IsHighlighted = item.IsHighlighted,
            BadgeText = item.BadgeText,
            Children = [.. byParent[item.Id].OrderBy(c => c.DisplayOrder).Select(Build)],
        };

        return Ok(byParent[null].OrderBy(i => i.DisplayOrder).Select(Build).ToList());
    }

    /// <summary>
    /// Public store settings, as a flat key/value map.
    ///
    /// Only whitelisted groups are exposed. A settings table becomes a
    /// convenient place to keep credentials, and "return everything" would
    /// eventually publish one.
    /// </summary>
    [HttpGet("settings")]
    public async Task<ActionResult<Dictionary<string, string?>>> GetSettings(CancellationToken ct = default)
    {
        string[] publicGroups = ["shipping", "contact", "general"];

        var settings = await db.StoreSettings.AsNoTracking()
            .Where(s => publicGroups.Contains(s.Group))
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        Response.Headers.CacheControl = "public, max-age=300";
        return Ok(settings);
    }

    [HttpPost("admin/nav/seed")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
    public async Task<ActionResult<object>> Seed(CancellationToken ct = default)
    {

        return Ok(await seeder.SeedAsync(ct));
    }

    private static string ResolveUrl(Models.NavItem item)
    {
        if (item.Category is not null) return $"/category/{item.Category.Slug}";
        if (item.Occasion is not null) return $"/occasion/{item.Occasion.Slug}";
        return item.Url ?? "#";
    }
}
