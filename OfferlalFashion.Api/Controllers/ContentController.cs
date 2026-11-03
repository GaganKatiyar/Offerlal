using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OfferlalFashion.Api.Models;
using OfferlalFashion.Api.Content;
using OfferlalFashion.Api.Dtos;

namespace OfferlalFashion.Api.Controllers;

[ApiController]
[Route("api/content")]
public class ContentController(
    ContentService content,
    HomepageSeeder seeder) : ControllerBase
{
    /// <summary>
    /// A composed content page. One request returns everything the page needs.
    ///
    /// Cache-Control rather than a server-side cache for now: this is a single
    /// instance, and the HTTP layer already does the heavy lifting. The 60s
    /// max-age is also the staleness bound on embedded product prices, which
    /// the PDP and bag remain authoritative for.
    /// </summary>
    [HttpGet("pages/{key}")]
    public async Task<ActionResult<ContentPageDto>> GetPage(string key, CancellationToken ct = default)
    {
        var page = await content.GetPageAsync(key, DateTime.UtcNow, ct);
        if (page is null) return NotFound($"Unknown content page '{key}'.");

        Response.Headers.CacheControl = "public, max-age=60, stale-while-revalidate=300";
        return Ok(page);
    }

    /// <summary>
    /// Captures the currently hardcoded homepage as CMS data. Idempotent: it
    /// refuses to touch a page that already has sections, so it can never
    /// overwrite edits made in admin.
    /// </summary>
    [HttpPost("seed-homepage")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
    public async Task<ActionResult<object>> SeedHomepage(CancellationToken ct = default)
    {

        return Ok(await seeder.SeedAsync(ct));
    }
}
