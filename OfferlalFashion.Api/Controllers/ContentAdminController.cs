using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Content;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// The CMS write API. Back-office only — anyone who can reach this can rewrite
/// the homepage.
/// </summary>
[ApiController]
[Route("api/admin/content")]
[Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
public class ContentAdminController(
    OfferlalFashionDbContext db,
    ContentService content) : ControllerBase
{
    /// <summary>
    /// The editable page graph: every section including inactive and scheduled
    /// ones, which the public endpoint deliberately filters out.
    /// </summary>
    [HttpGet("pages/{key}")]
    public async Task<ActionResult<AdminPageDto>> GetPage(string key, CancellationToken ct = default)
    {

        var page = await db.ContentPages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Key == key, ct);
        if (page is null) return NotFound($"Unknown content page '{key}'.");

        var sections = await db.PageSections.AsNoTracking()
            .Where(s => s.PageId == page.Id)
            .OrderBy(s => s.DisplayOrder)
            .Include(s => s.Items.OrderBy(i => i.DisplayOrder)).ThenInclude(i => i.MediaAsset)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .ToListAsync(ct);

        var types = await db.SectionTypes.AsNoTracking()
            .Where(t => t.IsActive)
            .OrderBy(t => t.DisplayOrder)
            .Select(t => new SectionTypeDto { Code = t.Code, Name = t.Name, ItemKind = t.ItemKind, MaxItems = t.MaxItems })
            .ToListAsync(ct);

        var rules = await db.ProductRules.AsNoTracking()
            .Where(r => r.IsActive)
            .OrderBy(r => r.Name)
            .Select(r => new ProductRuleDto { Id = r.Id, Name = r.Name, MaxItems = r.MaxItems })
            .ToListAsync(ct);

        return Ok(new AdminPageDto
        {
            Id = page.Id,
            Key = page.Key,
            Name = page.Name,
            PublishedRevisionId = page.PublishedRevisionId,
            SectionTypes = types,
            ProductRules = rules,
            Sections = [.. sections.Select(s => new AdminSectionDto
            {
                Id = s.Id,
                Type = s.SectionTypeCode,
                Eyebrow = s.Eyebrow,
                Heading = s.Heading,
                Subheading = s.Subheading,
                CtaLabel = s.CtaLabel,
                CtaUrl = s.CtaUrl,
                DisplayOrder = s.DisplayOrder,
                IsActive = s.IsActive,
                StartsAtUtc = s.StartsAtUtc,
                EndsAtUtc = s.EndsAtUtc,
                ProductRuleId = s.ProductRuleId,
                RowVersion = s.RowVersion is null ? null : Convert.ToBase64String(s.RowVersion),
                ItemCount = s.Items.Count,
                Items = [.. s.Items.OrderBy(i => i.DisplayOrder).Select(ToItemDto)],
            })],
        });
    }

    /// <summary>
    /// Applies edits to a page's sections.
    ///
    /// Takes the section list in one request rather than exposing granular
    /// per-section endpoints: a drag-and-drop reorder changes every section's
    /// DisplayOrder at once, and doing that as N requests would leave the page
    /// half-reordered if one failed.
    ///
    /// RowVersion is checked per section, so two people editing different
    /// sections do not collide while two editing the SAME section do.
    /// </summary>
    [HttpPut("pages/{key}/sections")]
    public async Task<ActionResult<object>> UpdateSections(
        string key,
        [FromBody] UpdateSectionsRequest request,
        CancellationToken ct = default)
    {

        var page = await db.ContentPages.FirstOrDefaultAsync(p => p.Key == key, ct);
        if (page is null) return NotFound($"Unknown content page '{key}'.");

        var sections = await db.PageSections
            .Where(s => s.PageId == page.Id)
            .ToDictionaryAsync(s => s.Id, ct);

        var conflicts = new List<int>();
        var updated = 0;

        foreach (var edit in request.Sections)
        {
            if (!sections.TryGetValue(edit.Id, out var section)) continue;

            // Optimistic concurrency, checked explicitly rather than relying on
            // EF's tracking: the client round-trips the version it read, and a
            // stale one means someone else saved in between.
            if (!string.IsNullOrEmpty(edit.RowVersion) && section.RowVersion is not null)
            {
                var seen = Convert.FromBase64String(edit.RowVersion);
                if (!seen.SequenceEqual(section.RowVersion))
                {
                    conflicts.Add(edit.Id);
                    continue;
                }
            }

            section.Eyebrow = Trim(edit.Eyebrow);
            section.Heading = Trim(edit.Heading);
            section.Subheading = Trim(edit.Subheading);
            section.CtaLabel = Trim(edit.CtaLabel);
            section.CtaUrl = Trim(edit.CtaUrl);
            section.DisplayOrder = edit.DisplayOrder;
            section.IsActive = edit.IsActive;
            section.StartsAtUtc = edit.StartsAtUtc;
            section.EndsAtUtc = edit.EndsAtUtc;
            section.ProductRuleId = edit.ProductRuleId;
            section.UpdatedAt = DateTime.UtcNow;
            updated++;
        }

        if (conflicts.Count > 0)
        {
            return Conflict(new
            {
                message = "Some sections were changed by someone else. Reload before saving.",
                conflictedSectionIds = conflicts,
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { updated });
    }

    // -----------------------------------------------------------------------
    // Section items — hero slides, trust badges, tiles, pinned products.
    //
    // These were database-only until now: the editor could reorder and reword
    // SECTIONS but not touch what was inside them, so changing a hero slide
    // meant SQL.
    // -----------------------------------------------------------------------

    [HttpPost("sections/{sectionId:int}/items")]
    public async Task<ActionResult<AdminSectionItemDto>> CreateItem(
        int sectionId,
        [FromBody] SectionItemWrite request,
        CancellationToken ct = default)
    {
        var section = await db.PageSections
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == sectionId, ct);

        if (section is null) return NotFound();

        // The section type declares how many items it holds and the renderer
        // assumes it. A hero with nine slides would silently drop five, so the
        // limit is refused here rather than discovered on the storefront.
        var type = await db.SectionTypes.FirstOrDefaultAsync(t => t.Code == section.SectionTypeCode, ct);
        if (type?.MaxItems is int max && section.Items.Count >= max)
        {
            return Conflict(new { message = $"{type.Name} holds at most {max} items." });
        }

        var item = new PageSectionItem
        {
            SectionId = sectionId,
            DisplayOrder = (section.Items.Select(i => i.DisplayOrder).DefaultIfEmpty(0).Max() / 10 + 1) * 10,
        };

        ApplyItem(item, request, type?.ItemKind);
        db.PageSectionItems.Add(item);
        await db.SaveChangesAsync(ct);

        return Ok(await ItemDtoAsync(item.Id, ct));
    }

    [HttpPut("items/{id:int}")]
    public async Task<ActionResult<AdminSectionItemDto>> UpdateItem(
        int id,
        [FromBody] SectionItemWrite request,
        CancellationToken ct = default)
    {
        var item = await db.PageSectionItems.Include(i => i.Section).FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return NotFound();

        var type = await db.SectionTypes.FirstOrDefaultAsync(t => t.Code == item.Section.SectionTypeCode, ct);
        ApplyItem(item, request, type?.ItemKind);
        await db.SaveChangesAsync(ct);

        return Ok(await ItemDtoAsync(item.Id, ct));
    }

    [HttpPut("sections/{sectionId:int}/items/reorder")]
    public async Task<ActionResult<object>> ReorderItems(
        int sectionId,
        [FromBody] ItemReorderRequest request,
        CancellationToken ct = default)
    {
        var items = await db.PageSectionItems
            .Where(i => i.SectionId == sectionId)
            .ToDictionaryAsync(i => i.Id, ct);

        foreach (var entry in request.Items)
        {
            if (!items.TryGetValue(entry.Id, out var item)) continue;
            item.DisplayOrder = entry.DisplayOrder;
            item.IsActive = entry.IsActive;
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { updated = request.Items.Count });
    }

    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> DeleteItem(int id, CancellationToken ct = default)
    {
        var item = await db.PageSectionItems.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return NotFound();

        db.PageSectionItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void ApplyItem(PageSectionItem item, SectionItemWrite request, string? sectionKind)
    {
        // The SECTION TYPE decides the kind, not the client: a trust badge
        // inside a hero carousel would render as an empty slide.
        item.ItemKind = sectionKind ?? request.ItemKind;
        item.Title = Trim(request.Title);
        item.Subtitle = Trim(request.Subtitle);
        item.Caption = Trim(request.Caption);
        item.BadgeText = Trim(request.BadgeText);
        item.LinkUrl = Trim(request.LinkUrl);
        item.IsActive = request.IsActive;
        item.MediaAssetId = request.MediaAssetId;
        item.ProductId = Trim(request.ProductId);
        item.CategoryId = Trim(request.CategoryId);
        item.OccasionId = Trim(request.OccasionId);
    }

    private static AdminSectionItemDto ToItemDto(PageSectionItem i) => new()
    {
        Id = i.Id,
        DisplayOrder = i.DisplayOrder,
        ItemKind = i.ItemKind,
        Title = i.Title,
        Subtitle = i.Subtitle,
        Caption = i.Caption,
        BadgeText = i.BadgeText,
        LinkUrl = i.LinkUrl,
        IsActive = i.IsActive,
        MediaAssetId = i.MediaAssetId,
        MediaUrl = i.MediaAsset?.Url,
        MediaAlt = i.MediaAsset?.AltText,
        ProductId = i.ProductId,
        ProductName = i.Product?.Name,
        CategoryId = i.CategoryId,
        OccasionId = i.OccasionId,
    };

    private async Task<AdminSectionItemDto> ItemDtoAsync(int id, CancellationToken ct)
    {
        var i = await db.PageSectionItems.AsNoTracking()
            .Include(x => x.MediaAsset)
            .Include(x => x.Product)
            .FirstAsync(x => x.Id == id, ct);

        return ToItemDto(i);
    }

    /// <summary>
    /// Publishes the current draft as a revision.
    ///
    /// The draft IS the section rows, so publishing composes them into a
    /// snapshot and flips the page's pointer. Rollback is flipping the pointer
    /// back, which is why revisions are whole snapshots rather than diffs.
    /// </summary>
    [HttpPost("pages/{key}/publish")]
    public async Task<ActionResult<object>> Publish(string key, [FromBody] PublishRequest? request, CancellationToken ct = default)
    {

        var page = await db.ContentPages.FirstOrDefaultAsync(p => p.Key == key, ct);
        if (page is null) return NotFound($"Unknown content page '{key}'.");

        // Composed with no time filter so SCHEDULED sections are captured with
        // their windows intact. Baking out the schedule would mean a section
        // set to go live tomorrow could never appear without republishing.
        var composed = await content.GetPageAsync(key, DateTime.MaxValue, ct);

        var revision = new PageRevision
        {
            PageId = page.Id,
            PayloadJson = System.Text.Json.JsonSerializer.Serialize(composed),
            PublishedAtUtc = DateTime.UtcNow,
            Note = request?.Note,
        };

        db.PageRevisions.Add(revision);
        await db.SaveChangesAsync(ct);

        page.PublishedRevisionId = revision.Id;
        await db.SaveChangesAsync(ct);

        return Ok(new { revisionId = revision.Id, publishedAtUtc = revision.PublishedAtUtc });
    }

    [HttpGet("pages/{key}/revisions")]
    public async Task<ActionResult<IReadOnlyList<RevisionDto>>> Revisions(string key, CancellationToken ct = default)
    {

        var page = await db.ContentPages.AsNoTracking().FirstOrDefaultAsync(p => p.Key == key, ct);
        if (page is null) return NotFound();

        var revisions = await db.PageRevisions.AsNoTracking()
            .Where(r => r.PageId == page.Id)
            .OrderByDescending(r => r.PublishedAtUtc)
            .Take(50)
            .Select(r => new RevisionDto
            {
                Id = r.Id,
                PublishedAtUtc = r.PublishedAtUtc,
                Note = r.Note,
                IsCurrent = page.PublishedRevisionId == r.Id,
            })
            .ToListAsync(ct);

        return Ok(revisions);
    }


    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed record UpdateSectionsRequest
{
    public IReadOnlyList<AdminSectionEdit> Sections { get; init; } = [];
}

public sealed record AdminSectionEdit
{
    public int Id { get; init; }
    public string? Eyebrow { get; init; }
    public string? Heading { get; init; }
    public string? Subheading { get; init; }
    public string? CtaLabel { get; init; }
    public string? CtaUrl { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime? StartsAtUtc { get; init; }
    public DateTime? EndsAtUtc { get; init; }
    public int? ProductRuleId { get; init; }
    public string? RowVersion { get; init; }
}

public sealed record ItemReorderRequest
{
    public IReadOnlyList<ItemReorderEntry> Items { get; init; } = [];
}

public sealed record ItemReorderEntry
{
    public int Id { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; } = true;
}

public sealed record PublishRequest
{
    public string? Note { get; init; }
}
