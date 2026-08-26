using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll(CancellationToken ct = default)
    {
        var categories = await db.Categories.AsNoTracking()
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync(ct);

        return Ok(categories.Select(c => c.ToDto()).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetById(string id, CancellationToken ct = default)
    {
        var category = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        return category is null ? NotFound() : Ok(category.ToDto());
    }

    /// <summary>Slug lookup — the storefront routes categories by slug.</summary>
    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<CategoryDto>> GetBySlug(string slug, CancellationToken ct = default)
    {
        var category = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);

        return category is null ? NotFound() : Ok(category.ToDto());
    }
}
