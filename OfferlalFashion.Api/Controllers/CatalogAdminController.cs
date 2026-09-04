using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OfferlalFashion.Api.Models;
using OfferlalFashion.Api.Catalog;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// Catalogue maintenance operations. Back-office only.
/// </summary>
[ApiController]
[Route("api/admin/catalog")]
[Authorize(Roles = $"{Roles.Admin},{Roles.Catalog}")]
public class CatalogAdminController(
    AttributeProjectionService projection,
    SizeChartSeeder sizeCharts) : ControllerBase
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

        var report = await projection.RebuildAllAsync(ct);
        return Ok(report);
    }

    /// <summary>Seeds size-chart measurements. Idempotent.</summary>
    [HttpPost("seed-size-charts")]
    public async Task<ActionResult<object>> SeedSizeCharts(CancellationToken ct = default)
    {

        var added = await sizeCharts.SeedAsync(ct);
        return Ok(new { measurementsAdded = added });
    }
}
