namespace OfferlalFashion.Api.Dtos;

/// <summary>
/// Exactly what a product card renders — nothing more.
///
/// Distinct from ProductSummaryDto, which carries description, tags, SKU, brand
/// and a full ProductImageDto. The PLP ships 24 of these per page and the
/// difference compounds; anything a card does not draw belongs on the detail
/// endpoint instead.
/// </summary>
public sealed record ProductCardDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string CategoryId { get; init; } = "";

    /// <summary>The bold descriptor line on the card ("Heavy Bridal", "Anarkali").</summary>
    public string? SubCategory { get; init; }

    public decimal Price { get; init; }
    public decimal? CompareAtPrice { get; init; }
    public string Currency { get; init; } = "INR";
    public decimal Rating { get; init; }
    public int ReviewCount { get; init; }
    public string StockStatus { get; init; } = "";
    public bool IsBestseller { get; init; }
    public bool IsNewArrival { get; init; }

    /// <summary>Fallback descriptor when SubCategory is absent.</summary>
    public string Fabric { get; init; } = "";

    /// <summary>Drives the "Made to measure" line and the custom-sizing filter.</summary>
    public bool HasCustomSizing { get; init; }

    public string? ThumbnailUrl { get; init; }
    public IReadOnlyList<SwatchDto> Swatches { get; init; } = [];
}

public sealed record SwatchDto
{
    public string Color { get; init; } = "";
    public string ColorHex { get; init; } = "";
}

public sealed record FacetOptionDto
{
    /// <summary>Slug — this is what appears in the URL query string.</summary>
    public string Value { get; init; } = "";
    public string Label { get; init; } = "";
    public int Count { get; init; }
    public string? SwatchHex { get; init; }
    public int DisplayOrder { get; init; }
}

public sealed record FacetDto
{
    public string Code { get; init; } = "";
    public string Label { get; init; } = "";

    /// <summary>swatch | multiselect — tells the rail how to render this facet.</summary>
    public string InputType { get; init; } = "multiselect";

    public IReadOnlyList<FacetOptionDto> Options { get; init; } = [];
}

public sealed record PriceBoundsDto
{
    public decimal Min { get; init; }
    public decimal Max { get; init; }
}

/// <summary>
/// One response carrying the page, the facet counts and the price bounds.
///
/// Deliberately a single round trip: the rail and the grid must agree, and
/// fetching them separately guarantees they eventually will not.
/// </summary>
public sealed record ProductSearchResult
{
    public IReadOnlyList<ProductCardDto> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;

    public IReadOnlyList<FacetDto> Facets { get; init; } = [];
    public PriceBoundsDto PriceBounds { get; init; } = new();
}
