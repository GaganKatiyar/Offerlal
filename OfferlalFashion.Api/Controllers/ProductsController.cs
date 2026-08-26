using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll([FromQuery] string? categoryId)
    {
        var query = db.Products.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(categoryId))
            query = query.Where(p => p.CategoryId == categoryId);

        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(string id)
    {
        var product = await db.Products.AsNoTracking()
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductImages)
            .Include(p => p.ProductVariants).ThenInclude(v => v.ProductSkus)
            .FirstOrDefaultAsync(p => p.Id == id);

        return product is null ? NotFound() : Ok(product);
    }
}
