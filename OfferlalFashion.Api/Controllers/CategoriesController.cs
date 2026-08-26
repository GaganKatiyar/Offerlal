using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetAll()
        => Ok(await db.Categories.AsNoTracking().OrderBy(c => c.DisplayOrder).ToListAsync());

    [HttpGet("{id}")]
    public async Task<ActionResult<Category>> GetById(string id)
    {
        var category = await db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        return category is null ? NotFound() : Ok(category);
    }
}
