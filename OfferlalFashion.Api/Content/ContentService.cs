using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Catalog;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Content;

/// <summary>
/// Composes a content page for the storefront.
///
/// One request returns the whole page, products embedded. Fetching each
/// section separately would mean the homepage fires N+1 requests before it can
/// paint, which is exactly the cost a homepage cannot afford.
///
/// TRADE-OFF, stated so it is not rediscovered as a bug: embedded product
/// prices and stock come from this composition, so under HTTP caching they can
/// be up to a minute stale. That is fine for a rail; the PDP and the bag remain
/// authoritative for anything a customer transacts on.
/// </summary>
public sealed class ContentService(OfferlalFashionDbContext db, ProductQueryService products)
{
    public async Task<ContentPageDto?> GetPageAsync(string key, DateTime nowUtc, CancellationToken ct = default)
    {
        var page = await db.ContentPages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Key == key, ct);

        if (page is null) return null;

        var sections = await db.PageSections.AsNoTracking()
            .Where(s => s.PageId == page.Id && s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .Include(s => s.Items.OrderBy(i => i.DisplayOrder))
                .ThenInclude(i => i.MediaAsset)
            .Include(s => s.Items).ThenInclude(i => i.MediaAssetMobile)
            .Include(s => s.Items).ThenInclude(i => i.Category)
            .Include(s => s.Items).ThenInclude(i => i.Occasion)
            .Include(s => s.ProductRule)
            .ToListAsync(ct);

        var result = new List<ContentSectionDto>();

        foreach (var section in sections)
        {
            // Scheduling is evaluated HERE, not baked into the published
            // snapshot — otherwise a section scheduled for Diwali morning could
            // never go live without someone republishing the page.
            if (!IsLive(section.StartsAtUtc, section.EndsAtUtc, nowUtc)) continue;

            var items = section.Items
                .Where(i => i.IsActive && IsLive(i.StartsAtUtc, i.EndsAtUtc, nowUtc))
                .OrderBy(i => i.DisplayOrder)
                .ToList();

            var dto = new ContentSectionDto
            {
                Id = section.Id,
                Type = section.SectionTypeCode,
                Eyebrow = section.Eyebrow,
                Heading = section.Heading,
                Subheading = section.Subheading,
                CtaLabel = section.CtaLabel,
                CtaUrl = section.CtaUrl,
                Config = ParseConfig(section.ConfigJson),
                Items = [.. items.Select(ToItemDto)],
                Products = await ResolveProductsAsync(section, items, ct),
            };

            result.Add(dto);
        }

        return new ContentPageDto
        {
            Key = page.Key,
            Name = page.Name,
            Sections = result,
        };
    }

    /// <summary>
    /// Pinned products first, then the rule backfills to MaxItems.
    ///
    /// This is what merchandisers actually need: "these three, then whatever
    /// else is new". Rule-only would lose the hand-picked hero items; pins-only
    /// would mean re-curating every rail by hand each week.
    /// </summary>
    private async Task<IReadOnlyList<ProductCardDto>> ResolveProductsAsync(
        PageSection section,
        List<PageSectionItem> items,
        CancellationToken ct)
    {
        var pinnedIds = items
            .Where(i => i.ItemKind == SectionItemKind.Product && i.ProductId != null)
            .Select(i => i.ProductId!)
            .ToList();

        var rule = section.ProductRule;
        if (pinnedIds.Count == 0 && rule is null) return [];

        var cards = new List<ProductCardDto>();

        if (pinnedIds.Count > 0)
        {
            var pinned = await products.GetCardsByIdsAsync(pinnedIds, ct);
            // Preserve the admin's pin order, which the database will not.
            cards.AddRange(pinnedIds
                .Select(id => pinned.FirstOrDefault(p => p.Id == id))
                .Where(p => p is not null)!);
        }

        if (rule is { IsActive: true })
        {
            var take = Math.Max(0, rule.MaxItems - cards.Count);
            if (take > 0)
            {
                var query = ProductRuleTranslator.Translate(rule.DefinitionJson, take);
                var filled = await products.GetCardsAsync(query, ct);

                var seen = cards.Select(c => c.Id).ToHashSet();
                cards.AddRange(filled.Where(c => seen.Add(c.Id)));
            }
        }

        return cards;
    }

    private static bool IsLive(DateTime? startsAt, DateTime? endsAt, DateTime nowUtc) =>
        (startsAt is null || startsAt <= nowUtc) && (endsAt is null || endsAt > nowUtc);

    private static ContentItemDto ToItemDto(PageSectionItem i) => new()
    {
        Id = i.Id,
        Kind = i.ItemKind,
        Title = i.Title,
        Subtitle = i.Subtitle,
        Caption = i.Caption,
        BadgeText = i.BadgeText,
        LinkUrl = i.LinkUrl ?? BuildLink(i),
        ImageUrl = i.MediaAsset?.Url,
        ImageAlt = i.MediaAsset?.AltText,
        MobileImageUrl = i.MediaAssetMobile?.Url,
        ProductId = i.ProductId,
        CategoryId = i.CategoryId,
        OccasionId = i.OccasionId,
    };

    /// <summary>
    /// Derives a link from the referenced entity when none is set explicitly,
    /// so renaming a category updates the homepage link instead of breaking it.
    /// </summary>
    private static string? BuildLink(PageSectionItem i) => i.ItemKind switch
    {
        SectionItemKind.Category when i.Category is not null => $"/category/{i.Category.Slug}",
        SectionItemKind.Occasion when i.Occasion is not null => $"/occasion/{i.Occasion.Slug}",
        _ => null,
    };

    private static Dictionary<string, JsonElement> ParseConfig(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json) ?? [];
        }
        catch (JsonException)
        {
            // A malformed config must not take the homepage down. The write
            // path validates, so this is belt-and-braces for hand-edited rows.
            return [];
        }
    }
}
