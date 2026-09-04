using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Dtos;
using OfferlalFashion.Api.Media;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// The media library API, backing the admin picker.
///
/// SECURITY: uploads and the backfill are gated on Development until
/// authentication exists. When JWT and roles land, replace the gate with
/// [Authorize(Roles = "Admin")] rather than deleting it — an open upload
/// endpoint is a file-drop for anyone who finds it.
/// </summary>
[ApiController]
[Route("api/media")]
public class MediaController(
    OfferlalFashionDbContext db,
    MediaService media,
    MediaBackfillService backfill,
    IWebHostEnvironment env) : ControllerBase
{
    /// <summary>Browse the library — the admin picker's list.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<MediaAssetDto>>> List(
        [FromQuery] string? folder,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 40,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = db.MediaAssets.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(folder)) query = query.Where(a => a.Folder == folder);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(a =>
                (a.AltText != null && EF.Functions.Like(a.AltText, $"%{term}%"))
                || (a.Tags != null && EF.Functions.Like(a.Tags, $"%{term}%")));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => a.ToDto())
            .ToListAsync(ct);

        return Ok(new PagedResult<MediaAssetDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total,
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MediaAssetDto>> GetById(int id, CancellationToken ct = default)
    {
        var asset = await db.MediaAssets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
        return asset is null ? NotFound() : Ok(asset.ToDto());
    }

    /// <summary>Folder list for the picker's sidebar, with counts.</summary>
    [HttpGet("folders")]
    public async Task<ActionResult<IReadOnlyList<MediaFolderDto>>> Folders(CancellationToken ct = default)
    {
        var folders = await db.MediaAssets.AsNoTracking()
            .GroupBy(a => a.Folder)
            .Select(g => new MediaFolderDto { Folder = g.Key, Count = g.Count() })
            .OrderBy(f => f.Folder)
            .ToListAsync(ct);

        return Ok(folders);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    public async Task<ActionResult<MediaAssetDto>> Upload(
        IFormFile file,
        [FromForm] string folder = "uploads",
        [FromForm] string? altText = null,
        CancellationToken ct = default)
    {
        if (!env.IsDevelopment()) return Forbidden();
        if (file is null || file.Length == 0) return BadRequest("No file supplied.");

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await media.UploadAsync(stream, file.FileName, file.ContentType, folder, altText, ct);

            // 200 for an existing asset, 201 for a new one — the caller can tell
            // whether its upload created something or matched a duplicate.
            return result.WasExisting
                ? Ok(result.Asset.ToDto())
                : CreatedAtAction(nameof(GetById), new { id = result.Asset.Id }, result.Asset.ToDto());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Updates the metadata a human authors. Never the bytes.</summary>
    [HttpPatch("{id:int}")]
    public async Task<ActionResult<MediaAssetDto>> Update(int id, [FromBody] UpdateMediaAssetRequest request, CancellationToken ct = default)
    {
        if (!env.IsDevelopment()) return Forbidden();

        var asset = await db.MediaAssets.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (asset is null) return NotFound();

        if (request.AltText is not null) asset.AltText = request.AltText.Trim();
        if (request.Folder is not null) asset.Folder = request.Folder.Trim();
        if (request.Tags is not null) asset.Tags = request.Tags.Trim();

        await db.SaveChangesAsync(ct);
        return Ok(asset.ToDto());
    }

    /// <summary>Links every legacy image URL to a library asset. Idempotent.</summary>
    [HttpPost("backfill")]
    public async Task<ActionResult<BackfillReport>> Backfill(CancellationToken ct = default)
    {
        if (!env.IsDevelopment()) return Forbidden();
        return Ok(await backfill.RunAsync(ct));
    }

    private ActionResult Forbidden() => Problem(
        title: "Not available",
        detail: "Media administration is restricted to Development until authentication is in place.",
        statusCode: StatusCodes.Status403Forbidden);
}

public sealed record UpdateMediaAssetRequest
{
    public string? AltText { get; init; }
    public string? Folder { get; init; }
    public string? Tags { get; init; }
}
