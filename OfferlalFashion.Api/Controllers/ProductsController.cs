using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(OfferlalFashionDbContext db) : ControllerBase
{
    private const int MaxPageSize = 100;

    /// <summary>Paged product list. Returns summaries — use GetBySlug/GetById for full detail.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductSummaryDto>>> GetAll(
        [FromQuery] string? categoryId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = db.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(categoryId))
        {
            // Match the category AND all its descendants. Products live on leaf
            // categories, so an exact CategoryId match on a parent would return
            // nothing. Uses the materialised Categories.Path, which is indexed.
            var path = await db.Categories.AsNoTracking()
                .Where(c => c.Id == categoryId)
                .Select(c => c.Path)
                .FirstOrDefaultAsync(ct);

            if (path is null) return NotFound($"Unknown category '{categoryId}'.");

            query = query.Where(p => p.Category.Path.StartsWith(path));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.Rating)
            .ThenBy(p => p.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.Brand)
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductImages)
            .ToListAsync(ct);

        return Ok(new PagedResult<ProductSummaryDto>
        {
            Items = items.Select(p => p.ToSummaryDto()).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
        });
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
