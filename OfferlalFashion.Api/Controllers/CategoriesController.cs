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
        // Hidden categories are excluded here, not just dimmed in admin. The
        // category editor creates new rows hidden precisely so they can be
        // written before they are merchandisable; without this filter that
        // toggle does nothing and a half-built category appears in the menus.
        var categories = await db.Categories.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Level).ThenBy(c => c.DisplayOrder)
            .ToListAsync(ct);

        return Ok(categories.Select(c => c.ToDto()).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetById(string id, CancellationToken ct = default)
    {
        var category = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive, ct);

        return category is null ? NotFound() : Ok(category.ToDto());
    }

    /// <summary>Slug lookup — the storefront routes categories by slug.</summary>
    [HttpGet("by-slug/{slug}")]
    public async Task<ActionResult<CategoryDto>> GetBySlug(string slug, CancellationToken ct = default)
    {
        // Hidden means hidden: a direct link to an unpublished category is a
        // 404, the same as one that does not exist.
        var category = await db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive, ct);

        return category is null ? NotFound() : Ok(category.ToDto());
    }
}
