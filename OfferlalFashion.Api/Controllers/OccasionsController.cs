using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// Occasions, read-only.
///
/// Occasions have been a first-class filter on the PLP and a link target in the
/// navigation tree since the catalogue work, but there has never been an
/// endpoint to list them — they were only ever reachable as an id inside
/// somebody else's query string. The navigation editor needs to offer them as
/// link targets, which is what finally makes the omission visible.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OccasionsController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<OccasionDto>>> GetAll(CancellationToken ct = default)
    {
        var occasions = await db.Occasions.AsNoTracking()
            .OrderBy(o => o.Name)
            .Select(o => new OccasionDto
            {
                Id = o.Id,
                Slug = o.Slug,
                Name = o.Name,
                Description = o.Description,
                // Prefer the media library asset over the legacy URL column,
                // matching how product and category images already resolve.
                ImageUrl = o.ImageAssetId != null
                    ? db.MediaAssets.Where(a => a.Id == o.ImageAssetId).Select(a => a.Url).FirstOrDefault()
                    : o.ImageUrl,
            })
            .ToListAsync(ct);

        return Ok(occasions);
    }
}

public sealed record OccasionDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string? Description { get; init; }
    public string? ImageUrl { get; init; }
}
