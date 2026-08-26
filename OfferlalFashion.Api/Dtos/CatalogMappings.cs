using System.Text.Json;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Dtos;

/// <summary>
/// Entity -> DTO mapping for the catalog.
///
/// Handles two shape mismatches between the database and the storefront contract:
///   1. AvailableSizes / CareInstructions / Tags are stored as JSON string columns
///      but are string arrays in the API contract.
///   2. SEO is stored as flat Seo* columns (with comma-separated keywords) but is
///      a nested object in the API contract.
/// </summary>
internal static class CatalogMappings
{
    /// <summary>Parses a JSON string[] column, tolerating null/empty/malformed values.</summary>
    private static IReadOnlyList<string> ParseJsonArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            // A malformed column should degrade to an empty list, not 500 the catalogue.
            return [];
        }
    }

    private static IReadOnlyList<string> SplitKeywords(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? []
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static SeoDto ToSeo(string slug, string? title, string? description, string? keywords) => new()
    {
        MetaTitle = title ?? "",
        MetaDescription = description ?? "",
        Slug = slug,
        Keywords = SplitKeywords(keywords),
    };

    public static ProductImageDto ToDto(this ProductImage i) => new()
    {
        Id = i.Id,
        Url = i.Url,
        Alt = i.Alt,
        IsPrimary = i.IsPrimary,
    };

    public static ProductSkuDto ToDto(this ProductSku s) => new()
    {
        Sku = s.Sku,
        Size = s.Size,
        Stock = s.Stock,
    };

    public static ProductVariantDto ToDto(this ProductVariant v) => new()
    {
        Id = v.Id,
        Color = v.Color,
        ColorHex = v.ColorHex,
        Images = v.ProductImages.OrderBy(i => i.SortOrder).Select(i => i.ToDto()).ToList(),
        Skus = v.ProductSkus.Select(s => s.ToDto()).ToList(),
    };

    public static CustomizationOptionDto ToDto(this CustomizationOption o) => new()
    {
        Id = o.Id,
        Type = o.Type,
        Label = o.Label,
        PriceDelta = o.PriceDelta,
        Description = o.Description,
    };

    public static ProductSummaryDto ToSummaryDto(this Product p)
    {
        var primary = p.ProductVariants
            .SelectMany(v => v.ProductImages)
            .OrderByDescending(i => i.IsPrimary)
            .ThenBy(i => i.SortOrder)
            .FirstOrDefault();

        return new ProductSummaryDto
        {
            Id = p.Id,
            Slug = p.Slug,
            Name = p.Name,
            Sku = p.Sku,
            CategoryId = p.CategoryId,
            ShortDescription = p.ShortDescription,
            Price = p.Price,
            CompareAtPrice = p.CompareAtPrice,
            Currency = p.Currency,
            Rating = p.Rating,
            ReviewCount = p.ReviewCount,
            StockStatus = p.StockStatus,
            IsBestseller = p.IsBestseller,
            IsNewArrival = p.IsNewArrival,
            IsFeatured = p.IsFeatured,
            IsBridal = p.IsBridal,
            Sizes = ParseJsonArray(p.AvailableSizes),
            Tags = ParseJsonArray(p.Tags),
            PrimaryImage = primary?.ToDto(),
        };
    }

    public static ProductDto ToDto(this Product p) => new()
    {
        Id = p.Id,
        Slug = p.Slug,
        Name = p.Name,
        Sku = p.Sku,
        CategoryId = p.CategoryId,
        SubCategory = p.SubCategory,
        Occasion = p.Occasions.Select(o => o.Name).ToList(),
        Description = p.Description,
        ShortDescription = p.ShortDescription,
        Fabric = p.Fabric,
        WorkDetails = p.WorkDetails,
        BlouseDetails = p.BlouseDetails,
        DupattaDetails = p.DupattaDetails,
        Variants = p.ProductVariants.Select(v => v.ToDto()).ToList(),
        Sizes = ParseJsonArray(p.AvailableSizes),
        Price = p.Price,
        CompareAtPrice = p.CompareAtPrice,
        Currency = p.Currency,
        Rating = p.Rating,
        ReviewCount = p.ReviewCount,
        StockStatus = p.StockStatus,
        CustomizationOptions = p.CustomizationOptions.Select(o => o.ToDto()).ToList(),
        IsBestseller = p.IsBestseller,
        IsNewArrival = p.IsNewArrival,
        IsFeatured = p.IsFeatured,
        IsBridal = p.IsBridal,
        CareInstructions = ParseJsonArray(p.CareInstructions),
        DeliveryEstimateDays = new DeliveryEstimateDto
        {
            Standard = p.DeliveryStandardDays,
            Express = p.DeliveryExpressDays,
        },
        WeightGrams = p.WeightGrams,
        Tags = ParseJsonArray(p.Tags),
        Seo = ToSeo(p.Slug, p.SeoTitle, p.SeoDescription, p.SeoKeywords),
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
    };

    public static CategoryDto ToDto(this Category c) => new()
    {
        Id = c.Id,
        Slug = c.Slug,
        Name = c.Name,
        Description = c.Description,
        HeroImageUrl = c.HeroImageUrl,
        ThumbnailUrl = c.ThumbnailUrl,
        ParentId = c.ParentId,
        DisplayOrder = c.DisplayOrder,
        Seo = ToSeo(c.Slug, c.SeoTitle, c.SeoDescription, c.SeoKeywords),
    };
}
