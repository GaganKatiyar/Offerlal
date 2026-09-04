using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Catalog;

/// <summary>
/// Seeds size-chart measurements as reference data.
///
/// Only the apparel scheme gets a chart. Kids sizes, footwear and dupatta
/// lengths deliberately get none yet, and jewellery has no size scheme at all —
/// so those products simply show no size guide, without any code knowing they
/// are different. That is the point of keying charts on the size attribute
/// rather than hardcoding one chart into the PDP.
/// </summary>
public sealed class SizeChartSeeder(OfferlalFashionDbContext db, ILogger<SizeChartSeeder> log)
{
    /// <summary>
    /// Apparel body measurements in inches. These are the values that were
    /// hardcoded in the storefront's PDP component, moved to where they can be
    /// edited without a deploy.
    /// </summary>
    private static readonly (string Size, decimal Bust, decimal Waist, decimal Hip, decimal Shoulder, decimal Length)[] Apparel =
    [
        ("XS",  32m, 26m, 35m, 13.5m, 41m),
        ("S",   34m, 28m, 37m, 14m,   41.5m),
        ("M",   36m, 30m, 39m, 14.5m, 42m),
        ("L",   38m, 32m, 41m, 15m,   42.5m),
        ("XL",  40m, 34m, 43m, 15.5m, 43m),
        ("XXL", 42m, 36m, 45m, 16m,   43.5m),
    ];

    private static readonly (string Code, string Label, int Order)[] Measurements =
    [
        ("bust", "Bust", 1),
        ("waist", "Waist", 2),
        ("hip", "Hip", 3),
        ("shoulder", "Shoulder", 4),
        ("length", "Length", 5),
    ];

    public async Task<int> SeedAsync(CancellationToken ct = default)
    {
        var attribute = await db.CatalogAttributes
            .FirstOrDefaultAsync(a => a.Code == CatalogVocabulary.Codes.SizeApparel, ct);

        if (attribute is null)
        {
            log.LogWarning("Apparel size attribute missing — run the attribute projection first.");
            return 0;
        }

        var options = await db.AttributeOptions
            .Where(o => o.AttributeId == attribute.Id)
            .ToDictionaryAsync(o => o.Value.ToUpperInvariant(), ct);

        var existing = await db.SizeChartMeasurements
            .Where(m => m.AttributeId == attribute.Id)
            .Select(m => new { m.OptionId, m.Code })
            .ToListAsync(ct);

        var have = existing.Select(e => (e.OptionId, e.Code)).ToHashSet();
        var added = 0;

        foreach (var row in Apparel)
        {
            // A size present in the chart but absent from the catalogue (XXL is
            // not stocked) is skipped rather than invented — the chart describes
            // sizes that exist, not sizes we wish existed.
            if (!options.TryGetValue(row.Size, out var option)) continue;

            var values = new Dictionary<string, decimal>
            {
                ["bust"] = row.Bust,
                ["waist"] = row.Waist,
                ["hip"] = row.Hip,
                ["shoulder"] = row.Shoulder,
                ["length"] = row.Length,
            };

            foreach (var (code, label, order) in Measurements)
            {
                if (have.Contains((option.Id, code))) continue;

                db.SizeChartMeasurements.Add(new SizeChartMeasurement
                {
                    AttributeId = attribute.Id,
                    OptionId = option.Id,
                    Code = code,
                    Label = label,
                    Value = values[code],
                    Unit = "in",
                    DisplayOrder = order,
                });
                added++;
            }
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation("Size chart seeded: {Added} measurements added", added);
        return added;
    }
}
