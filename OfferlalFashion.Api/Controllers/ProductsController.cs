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

    private IQueryable<Models.Product> LoadDetail() =>
        db.Products.AsNoTracking()
            .Include(p => p.Brand)
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductImages)
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductSkus)
            .Include(p => p.CustomizationOptions)
            .Include(p => p.Occasions);
}
