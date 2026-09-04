using Microsoft.AspNetCore.Mvc;
using OfferlalFashion.Api.Catalog;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// Catalogue maintenance operations.
///
/// SECURITY: there is no authentication in the application yet, so every action
/// here is gated on the hosting environment being Development. When JWT and
/// roles land, replace that gate with [Authorize(Roles = "Admin")] — do not
/// simply delete it, or a catalogue rebuild becomes an unauthenticated public
/// endpoint.
/// </summary>
[ApiController]
[Route("api/admin/catalog")]
public class CatalogAdminController(
    AttributeProjectionService projection,
    SizeChartSeeder sizeCharts,
    IWebHostEnvironment env) : ControllerBase
{
    /// <summary>
    /// Rebuilds the facet projection from the authoritative catalogue tables.
    ///
    /// Safe to run repeatedly: the projection is derived data, so a rebuild is
    /// idempotent. Returns the source values the vocabulary did not recognise —
    /// those are the queue of terms to add to CatalogVocabulary, not errors.
    /// </summary>
    [HttpPost("rebuild-attributes")]
    public async Task<ActionResult<ProjectionReport>> RebuildAttributes(CancellationToken ct = default)
    {
        if (!env.IsDevelopment())
        {
            return Problem(
                title: "Not available",
                detail: "Catalogue rebuild is restricted to Development until authentication is in place.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var report = await projection.RebuildAllAsync(ct);
        return Ok(report);
    }

    /// <summary>Seeds size-chart measurements. Idempotent.</summary>
    [HttpPost("seed-size-charts")]
    public async Task<ActionResult<object>> SeedSizeCharts(CancellationToken ct = default)
    {
        if (!env.IsDevelopment())
        {
            return Problem(
                title: "Not available",
                detail: "Size chart seeding is restricted to Development until authentication is in place.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var added = await sizeCharts.SeedAsync(ct);
        return Ok(new { measurementsAdded = added });
    }
}
