namespace OfferlalFashion.Api.Dtos;

/// <summary>
/// Catalog response contracts.
///
/// These deliberately mirror the interfaces in the Angular app
/// (src/app/core/models/product.model.ts and category.model.ts) so the
/// storefront can switch from its in-memory demo store to these endpoints
/// without reshaping data on the way in.
///
/// Returning DTOs rather than EF entities also (a) prevents the navigation-property
/// cycles that make entity serialization blow up, and (b) makes it structurally
/// impossible to leak columns like Customer.PasswordHash.
/// </summary>

public sealed record SeoDto
{
    public string MetaTitle { get; init; } = "";
    public string MetaDescription { get; init; } = "";
    public string Slug { get; init; } = "";
    public IReadOnlyList<string> Keywords { get; init; } = [];
}

public sealed record DeliveryEstimateDto
{
    public int Standard { get; init; }
    public int? Express { get; init; }
}

public sealed record ProductImageDto
{
    public string Id { get; init; } = "";
    public string Url { get; init; } = "";
    public string Alt { get; init; } = "";
    public bool IsPrimary { get; init; }
}

public sealed record ProductSkuDto
{
    public string Sku { get; init; } = "";
    public string Size { get; init; } = "";
    public int Stock { get; init; }
}

public sealed record ProductVariantDto
{
    public string Id { get; init; } = "";
    public string Color { get; init; } = "";
    public string ColorHex { get; init; } = "";
    public IReadOnlyList<ProductImageDto> Images { get; init; } = [];
    public IReadOnlyList<ProductSkuDto> Skus { get; init; } = [];
}

public sealed record CustomizationOptionDto
{
    public string Id { get; init; } = "";
    public string Type { get; init; } = "";
    public string Label { get; init; } = "";
    public decimal PriceDelta { get; init; }
    public string? Description { get; init; }
}

/// <summary>Lightweight shape for grids and carousels — no variants or options.</summary>
public sealed record ProductSummaryDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public string CategoryId { get; init; } = "";
    public string ShortDescription { get; init; } = "";
    public decimal Price { get; init; }
    public decimal? CompareAtPrice { get; init; }
    public string Currency { get; init; } = "INR";
    public decimal Rating { get; init; }
    public int ReviewCount { get; init; }
    public string StockStatus { get; init; } = "";
    public bool IsBestseller { get; init; }
    public bool IsNewArrival { get; init; }
    public bool IsFeatured { get; init; }
    public bool IsBridal { get; init; }
    public IReadOnlyList<string> Sizes { get; init; } = [];
    public IReadOnlyList<string> Tags { get; init; } = [];
    public ProductImageDto? PrimaryImage { get; init; }
}

public sealed record ProductDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public string CategoryId { get; init; } = "";
    public string? SubCategory { get; init; }
    public IReadOnlyList<string> Occasion { get; init; } = [];
    public string Description { get; init; } = "";
    public string ShortDescription { get; init; } = "";
    public string Fabric { get; init; } = "";
    public string WorkDetails { get; init; } = "";
    public string? BlouseDetails { get; init; }
    public string? DupattaDetails { get; init; }
    public IReadOnlyList<ProductVariantDto> Variants { get; init; } = [];
    public IReadOnlyList<string> Sizes { get; init; } = [];
    public decimal Price { get; init; }
    public decimal? CompareAtPrice { get; init; }
    public string Currency { get; init; } = "INR";
    public decimal Rating { get; init; }
    public int ReviewCount { get; init; }
    public string StockStatus { get; init; } = "";
    public IReadOnlyList<CustomizationOptionDto> CustomizationOptions { get; init; } = [];
    public bool IsBestseller { get; init; }
    public bool IsNewArrival { get; init; }
    public bool IsFeatured { get; init; }
    public bool IsBridal { get; init; }
    public IReadOnlyList<string> CareInstructions { get; init; } = [];
    public DeliveryEstimateDto DeliveryEstimateDays { get; init; } = new();
    public int? WeightGrams { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = [];
    public SeoDto Seo { get; init; } = new();
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed record CategoryDto
{
    public string Id { get; init; } = "";
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string Description { get; init; } = "";
    public string HeroImageUrl { get; init; } = "";
    public string ThumbnailUrl { get; init; } = "";
    public string? ParentId { get; init; }
    public int DisplayOrder { get; init; }
    public SeoDto Seo { get; init; } = new();
}
