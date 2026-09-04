using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Catalog;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(OfferlalFashionDbContext db, ProductQueryService queries) : ControllerBase
{
    private const int MaxPageSize = 100;

    /// <summary>
    /// Faceted, sorted, paged product search — the PLP's only catalogue call.
    ///
    /// Facet selections arrive as repeated query keys prefixed with "f.", e.g.
    /// ?f.colour=red&amp;f.colour=gold&amp;f.fabric=silk. A prefix keeps the
    /// attribute set open: a new facet needs no new parameter and no redeploy.
    ///
    /// Query parameters rather than path segments, deliberately. Path-segment
    /// facets generate an unbounded set of crawlable URLs from a handful of
    /// filters, which is a well-known way to bury a catalogue in duplicate
    /// content.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ProductSearchResult>> Search(
        [FromQuery] string? categoryId,
        [FromQuery] string? occasionId,
        [FromQuery] string? q,
        [FromQuery] decimal? priceMin,
        [FromQuery] decimal? priceMax,
        [FromQuery] bool inStock = false,
        [FromQuery] bool customSizing = false,
        [FromQuery] bool newArrivals = false,
        [FromQuery] bool onSale = false,
        [FromQuery] decimal? minRating = null,
        [FromQuery] string sort = "recommended",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        var query = new ProductQuery
        {
            CategoryId = categoryId,
            OccasionId = occasionId,
            Search = q,
            PriceMin = priceMin,
            PriceMax = priceMax,
            InStockOnly = inStock,
            CustomSizingOnly = customSizing,
            NewArrivalsOnly = newArrivals,
            OnSaleOnly = onSale,
            MinRating = minRating,
            Sort = sort,
            Page = page,
            PageSize = pageSize,
            Facets = ReadFacetParams(),
        };

        var result = await queries.SearchAsync(query, ct);
        return result is null ? NotFound($"Unknown category '{categoryId}'.") : Ok(result);
    }

    /// <summary>Collects ?f.&lt;code&gt;=slug pairs into attribute -> slugs.</summary>
    private Dictionary<string, string[]> ReadFacetParams()
    {
        var facets = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, values) in Request.Query)
        {
            if (!key.StartsWith("f.", StringComparison.OrdinalIgnoreCase)) continue;

            var code = key[2..];
            if (string.IsNullOrWhiteSpace(code)) continue;

            // Accept both repeated keys and one comma-joined value, since both
            // shapes turn up from hand-edited URLs and from the router.
            var slugs = values
                .SelectMany(v => (v ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (slugs.Length > 0) facets[code] = slugs;
        }

        return facets;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(string id, CancellationToken ct = default)
    {
        var product = await LoadDetail().FirstOrDefaultAsync(p => p.Id == id, ct);
        return product is null ? NotFound() : Ok(product.ToDto());
    }

    /// <summary>Slug lookup — the storefront routes products by slug, not id.</summary>
    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<ProductDto>> GetBySlug(string slug, CancellationToken ct = default)
    {
        var product = await LoadDetail().FirstOrDefaultAsync(p => p.Slug == slug, ct);
        return product is null ? NotFound() : Ok(product.ToDto());
    }

    /// <summary>
    /// The size chart that applies to this product, or 204 when none does.
    ///
    /// Resolved from the product's own SKUs: whichever size scheme its sizes
    /// belong to is the scheme whose chart applies. Jewellery and footwear
    /// have no seeded chart, so they get 204 and the PDP renders no size guide
    /// — no category special-casing anywhere.
    /// </summary>
    [HttpGet("{id}/size-chart")]
    public async Task<ActionResult<SizeChartDto>> GetSizeChart(string id, CancellationToken ct = default)
    {
        var optionIds = await db.ProductSkus
            .Where(s => s.Variant.ProductId == id && s.SizeOptionId != null)
            .Select(s => s.SizeOptionId!.Value)
            .Distinct()
            .ToListAsync(ct);

        if (optionIds.Count == 0) return NoContent();

        var measurements = await db.SizeChartMeasurements
            .AsNoTracking()
            .Where(m => optionIds.Contains(m.OptionId))
            .Include(m => m.Option)
            .Include(m => m.Attribute)
            .ToListAsync(ct);

        if (measurements.Count == 0) return NoContent();

        var attribute = measurements[0].Attribute;

        var columns = measurements
            .GroupBy(m => new { m.Code, m.Label, m.DisplayOrder })
            .OrderBy(g => g.Key.DisplayOrder)
            .Select(g => new SizeChartColumnDto { Code = g.Key.Code, Label = g.Key.Label })
            .ToList();

        // Group by OptionId, not by the Option reference.
        //
        // AsNoTracking disables EF's identity map, so every measurement row
        // materialises its OWN Option instance even when they are the same
        // size. Grouping by reference therefore produced one group per
        // measurement — the chart rendered "S" five times with one column
        // filled in each.
        var rows = measurements
            .GroupBy(m => m.OptionId)
            .Select(g => new
            {
                g.First().Option.Value,
                g.First().Option.DisplayOrder,
                Values = g.ToDictionary(m => m.Code, m => m.Value),
            })
            .OrderBy(r => r.DisplayOrder)
            .Select(r => new SizeChartRowDto { Size = r.Value, Values = r.Values })
            .ToList();

        return Ok(new SizeChartDto
        {
            AttributeCode = attribute.Code,
            Label = attribute.Name,
            Unit = measurements[0].Unit,
            Columns = columns,
            Rows = rows,
        });
    }

    private IQueryable<Models.Product> LoadDetail() =>
        db.Products.AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductImages)
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductSkus)
            .Include(p => p.CustomizationOptions)
            .Include(p => p.Occasions);
}
