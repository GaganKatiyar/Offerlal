using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Dtos;

public sealed record MediaAssetDto
{
    public int Id { get; init; }
    public string Url { get; init; } = "";
    public string? AltText { get; init; }
    public string ContentType { get; init; } = "";
    public int? Width { get; init; }
    public int? Height { get; init; }
    public long? Bytes { get; init; }
    public string Folder { get; init; } = "";
    public string? Tags { get; init; }
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// True when this app hosts the bytes. The storefront needs to know,
    /// because own-hosted images have generated derivatives at fixed widths
    /// while external ones rely on their host's resizing.
    /// </summary>
    public bool IsOwned { get; init; }

    /// <summary>Widths that actually exist on disk, for building a srcset.</summary>
    public IReadOnlyList<int> DerivativeWidths { get; init; } = [];
}

public sealed record MediaFolderDto
{
    public string Folder { get; init; } = "";
    public int Count { get; init; }
}

public static class MediaMappings
{
    public static MediaAssetDto ToDto(this MediaAsset a) => new()
    {
        Id = a.Id,
        Url = a.Url,
        AltText = a.AltText,
        ContentType = a.ContentType,
        Width = a.Width,
        Height = a.Height,
        Bytes = a.Bytes,
        Folder = a.Folder,
        Tags = a.Tags,
        CreatedAt = a.CreatedAt,
        IsOwned = a.StorageKey != null,
        DerivativeWidths = ParseWidths(a.DerivativeWidths),
    };

    private static IReadOnlyList<int> ParseWidths(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return [];
        return [.. csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(v => int.TryParse(v, out var n) ? n : 0)
            .Where(n => n > 0)];
    }
}
