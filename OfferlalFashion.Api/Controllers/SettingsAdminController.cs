using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// Store settings, editable.
///
/// The public endpoint has been read-only since the navigation work, so values
/// that genuinely drive pricing — the free-shipping threshold, the flat and
/// express fees — could only be changed with SQL.
/// </summary>
[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = $"{Roles.Admin},{Roles.Content}")]
public class SettingsAdminController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoreSettingDto>>> GetAll(CancellationToken ct = default)
    {
        var settings = await db.StoreSettings.AsNoTracking()
            .OrderBy(s => s.Group)
            .ThenBy(s => s.Key)
            .Select(s => new StoreSettingDto
            {
                Key = s.Key,
                Value = s.Value,
                ValueType = s.ValueType,
                Group = s.Group,
                Description = s.Description,
                UpdatedAt = s.UpdatedAt,
            })
            .ToListAsync(ct);

        return Ok(settings);
    }

    /// <summary>
    /// Saves several settings at once.
    ///
    /// One request because the shipping values are read together and only make
    /// sense together — a threshold saved without its fee is a half-applied
    /// pricing rule that would quote real customers wrongly in between.
    ///
    /// Every value is validated against its declared type BEFORE anything is
    /// written, so a rejected batch leaves the store exactly as it was rather
    /// than partly updated.
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<object>> Update([FromBody] UpdateSettingsRequest request, CancellationToken ct = default)
    {
        var existing = await db.StoreSettings.ToDictionaryAsync(s => s.Key, ct);
        var problems = new List<string>();

        foreach (var change in request.Settings)
        {
            if (!existing.TryGetValue(change.Key, out var setting))
            {
                // Settings are reference data defined in code, not created by
                // the admin: an unknown key is a stale client, not a new value.
                problems.Add($"Unknown setting '{change.Key}'.");
                continue;
            }

            var error = Validate(setting, change.Value);
            if (error is not null) problems.Add(error);
        }

        if (problems.Count > 0)
        {
            return BadRequest(new { message = "Some values could not be saved.", problems });
        }

        var updated = 0;
        foreach (var change in request.Settings)
        {
            var setting = existing[change.Key];
            if (setting.Value == change.Value) continue;

            setting.Value = change.Value;
            setting.UpdatedAt = DateTime.UtcNow;
            updated++;
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { updated });
    }

    private static string? Validate(StoreSetting setting, string? value)
    {
        var label = setting.Key;

        if (string.IsNullOrWhiteSpace(value))
        {
            // An empty shipping fee would be read as its fallback rather than
            // as zero, which is a silent pricing change.
            return setting.ValueType is "decimal" or "int"
                ? $"{label} cannot be empty."
                : null;
        }

        return setting.ValueType switch
        {
            "decimal" when !decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)
                => $"{label} must be a number.",
            "decimal" when decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var neg) && neg < 0
                => $"{label} cannot be negative.",
            "int" when !int.TryParse(value, out _) => $"{label} must be a whole number.",
            "bool" when !bool.TryParse(value, out _) => $"{label} must be true or false.",
            _ => null,
        };
    }
}

public sealed record StoreSettingDto
{
    public string Key { get; init; } = "";
    public string? Value { get; init; }
    public string ValueType { get; init; } = "string";
    public string Group { get; init; } = "";
    public string? Description { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed record UpdateSettingsRequest
{
    public IReadOnlyList<SettingChange> Settings { get; init; } = [];
}

public sealed record SettingChange
{
    public string Key { get; init; } = "";
    public string? Value { get; init; }
}
