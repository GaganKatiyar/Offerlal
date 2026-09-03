using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Catalog;

/// <summary>Everything the PLP can ask for, parsed from the query string.</summary>
public sealed record ProductQuery
{
    public string? CategoryId { get; init; }
    public string? OccasionId { get; init; }
    public string? Search { get; init; }
    public decimal? PriceMin { get; init; }
    public decimal? PriceMax { get; init; }
    public bool InStockOnly { get; init; }
    public bool CustomSizingOnly { get; init; }

    /// <summary>Backs the /new-arrivals route.</summary>
    public bool NewArrivalsOnly { get; init; }

    /// <summary>
    /// Backs the /sale route. "On sale" is derived rather than stored: a
    /// product is on sale when it has a compare-at price above its price, so
    /// there is no flag to fall out of date when a price changes.
    /// </summary>
    public bool OnSaleOnly { get; init; }
    public decimal? MinRating { get; init; }
    public string Sort { get; init; } = "recommended";
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 24;

    /// <summary>
    /// Selected facet options, keyed by attribute code: colour=red,gold.
    /// Within one attribute the options are OR-ed; across attributes they are
    /// AND-ed. That is what shoppers expect — "red OR gold, in silk" — and it
    /// is why this cannot be a single flat WHERE ... IN.
    /// </summary>
    public IReadOnlyDictionary<string, string[]> Facets { get; init; } =
        new Dictionary<string, string[]>();
}

/// <summary>
/// Server-side catalogue querying: filtering, sorting, paging and facet counts.
///
/// This replaces the storefront's client-side approach, where ProductBrowser
/// received the ENTIRE product array as an input and recomputed every filter,
/// facet list and count in computed() signals on each toggle. That required
/// shipping the whole catalogue to the browser and re-walking it constantly,
/// and its facet counts were wrong across pagination because they only ever saw
/// the loaded page.
/// </summary>
public sealed class ProductQueryService(OfferlalFashionDbContext db)
{
    public const int MaxPageSize = 100;

    /// <summary>
    /// Applies every filter EXCEPT the named attribute.
    ///
    /// Facet counts must exclude their own attribute's selection, otherwise
    /// selecting "Red" makes every other colour report zero and the shopper can
    /// never broaden to "Red or Gold" without clearing first. Counts for other
    /// attributes stay narrowed by the current selection, which is what makes
    /// them useful.
    /// </summary>
    private IQueryable<Product> BuildQuery(ProductQuery q, string? excludeAttributeCode, string? categoryPath)
    {
        var query = db.Products.AsNoTracking();

        if (categoryPath is not null)
        {
            // Match the category AND its descendants via the materialised path;
            // products live on leaf categories, so an exact match on a parent
            // would return nothing.
            query = query.Where(p => p.Category.Path.StartsWith(categoryPath));
        }

        if (!string.IsNullOrWhiteSpace(q.OccasionId))
        {
            query = query.Where(p => p.Occasions.Any(o => o.Id == q.OccasionId));
        }

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = q.Search.Trim();
            query = query.Where(p =>
                EF.Functions.Like(p.Name, $"%{term}%")
                || EF.Functions.Like(p.ShortDescription, $"%{term}%")
                || EF.Functions.Like(p.Fabric, $"%{term}%")
                || EF.Functions.Like(p.WorkDetails, $"%{term}%")
                || EF.Functions.Like(p.Tags, $"%{term}%"));
        }

        if (q.PriceMin is not null) query = query.Where(p => p.Price >= q.PriceMin);
        if (q.PriceMax is not null) query = query.Where(p => p.Price <= q.PriceMax);
        if (q.MinRating is not null) query = query.Where(p => p.Rating >= q.MinRating);

        if (q.InStockOnly)
        {
            query = query.Where(p => p.StockStatus != "out-of-stock");
        }

        if (q.NewArrivalsOnly) query = query.Where(p => p.IsNewArrival);

        if (q.OnSaleOnly) query = query.Where(p => p.CompareAtPrice != null && p.CompareAtPrice > p.Price);

        if (q.CustomSizingOnly)
        {
            // Made-to-measure is a property of the SKU list, not a size facet.
            // Filtering these garments by "M" would be misleading.
            query = query.Where(p => p.ProductVariants.Any(v => v.ProductSkus.Any(s => s.Size == "Custom")));
        }

        foreach (var (code, slugs) in q.Facets)
        {
            if (code == excludeAttributeCode || slugs.Length == 0) continue;

            // One EXISTS per attribute (AND across attributes), with the slugs
            // OR-ed inside it. Reads the covering index on
            // ProductAttributeOptions(AttributeId, OptionId, ProductId).
            var captured = slugs;
            var capturedCode = code;
            query = query.Where(p => p.AttributeOptions.Any(link =>
                link.Attribute.Code == capturedCode && captured.Contains(link.Option.Slug)));
        }

        return query;
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> query, string sort) => sort switch
    {
        "newest" => query.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id),
        "bestselling" => query.OrderByDescending(p => p.IsBestseller).ThenByDescending(p => p.ReviewCount).ThenBy(p => p.Id),
        "price-asc" => query.OrderBy(p => p.Price).ThenBy(p => p.Id),
        "price-desc" => query.OrderByDescending(p => p.Price).ThenBy(p => p.Id),
        "rating" => query.OrderByDescending(p => p.Rating).ThenByDescending(p => p.ReviewCount).ThenBy(p => p.Id),
        // Every sort ends with a tiebreak on Id. Without it SQL Server may
        // return a different order for equal keys between pages, which shows up
        // as items duplicated on one page and missing from the next.
        _ => query.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.Rating).ThenBy(p => p.Id),
    };

    public async Task<ProductSearchResult?> SearchAsync(ProductQuery q, CancellationToken ct = default)
    {
        string? categoryPath = null;
        if (!string.IsNullOrWhiteSpace(q.CategoryId))
        {
            categoryPath = await db.Categories.AsNoTracking()
                .Where(c => c.Id == q.CategoryId)
                .Select(c => c.Path)
                .FirstOrDefaultAsync(ct);

            if (categoryPath is null) return null; // unknown category -> 404 at the controller
        }

        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, MaxPageSize);

        var baseQuery = BuildQuery(q, excludeAttributeCode: null, categoryPath);
        var total = await baseQuery.CountAsync(ct);

        // Projected, not materialised.
        //
        // The previous implementation Included the full variant graph AND every
        // image on every variant to build a card that needs one thumbnail and a
        // handful of swatches. At 24 cards a page that is the PLP's first
        // scaling wall. This projects exactly the columns the card renders.
        var items = await ApplySort(baseQuery, q.Sort)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductCardDto
            {
                Id = p.Id,
                Slug = p.Slug,
                Name = p.Name,
                CategoryId = p.CategoryId,
                SubCategory = p.SubCategory,
                Price = p.Price,
                CompareAtPrice = p.CompareAtPrice,
                Currency = p.Currency,
                Rating = p.Rating,
                ReviewCount = p.ReviewCount,
                StockStatus = p.StockStatus,
                IsBestseller = p.IsBestseller,
                IsNewArrival = p.IsNewArrival,
                Fabric = p.Fabric,
                HasCustomSizing = p.ProductVariants.Any(v => v.ProductSkus.Any(s => s.Size == "Custom")),
                ThumbnailUrl = p.ProductVariants
                    .SelectMany(v => v.ProductImages)
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.SortOrder)
                    .Select(i => i.Url)
                    .FirstOrDefault(),
                Swatches = p.ProductVariants
                    .OrderBy(v => v.Id)
                    .Select(v => new SwatchDto { Color = v.Color, ColorHex = v.ColorHex })
                    .ToList(),
            })
            .ToListAsync(ct);

        var facets = await BuildFacetsAsync(q, categoryPath, ct);
        var priceBounds = await BuildPriceBoundsAsync(q, categoryPath, ct);

        return new ProductSearchResult
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
            Facets = facets,
            PriceBounds = priceBounds,
        };
    }

    private async Task<List<FacetDto>> BuildFacetsAsync(ProductQuery q, string? categoryPath, CancellationToken ct)
    {
        var attributes = await db.CatalogAttributes.AsNoTracking()
            .Where(a => a.IsFacetable)
            .OrderBy(a => a.DisplayOrder)
            .Select(a => new { a.Id, a.Code, a.Name, a.InputType })
            .ToListAsync(ct);

        var facets = new List<FacetDto>();

        foreach (var attr in attributes)
        {
            // Counts for THIS attribute ignore this attribute's own selection.
            var scoped = BuildQuery(q, excludeAttributeCode: attr.Code, categoryPath);

            var options = await scoped
                .SelectMany(p => p.AttributeOptions)
                .Where(link => link.AttributeId == attr.Id)
                .GroupBy(link => new { link.Option.Slug, link.Option.Value, link.Option.ColorHex, link.Option.DisplayOrder })
                .Select(g => new FacetOptionDto
                {
                    Value = g.Key.Slug,
                    Label = g.Key.Value,
                    SwatchHex = g.Key.ColorHex,
                    Count = g.Select(x => x.ProductId).Distinct().Count(),
                    DisplayOrder = g.Key.DisplayOrder,
                })
                .ToListAsync(ct);

            // A facet with nothing in it is noise in the rail, not a filter.
            if (options.Count == 0) continue;

            facets.Add(new FacetDto
            {
                Code = attr.Code,
                Label = attr.Name,
                InputType = attr.InputType,
                Options = [.. options.OrderBy(o => o.DisplayOrder).ThenBy(o => o.Label)],
            });
        }

        return facets;
    }

    /// <summary>
    /// Price slider bounds. Deliberately ignores the current price selection,
    /// so dragging the slider narrower does not shrink the track underneath it.
    /// </summary>
    private async Task<PriceBoundsDto> BuildPriceBoundsAsync(ProductQuery q, string? categoryPath, CancellationToken ct)
    {
        var withoutPrice = q with { PriceMin = null, PriceMax = null };
        var scoped = BuildQuery(withoutPrice, excludeAttributeCode: null, categoryPath);

        var bounds = await scoped
            .GroupBy(_ => 1)
            .Select(g => new { Min = g.Min(p => p.Price), Max = g.Max(p => p.Price) })
            .FirstOrDefaultAsync(ct);

        return new PriceBoundsDto
        {
            Min = bounds?.Min ?? 0,
            Max = bounds?.Max ?? 0,
        };
    }
}
