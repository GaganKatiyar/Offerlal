using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Product
{
    public string Id { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Sku { get; set; } = null!;

    public string CategoryId { get; set; } = null!;

    public int BrandId { get; set; }

    /// <summary>
    /// Legacy free-text sub-category. Superseded by real child categories —
    /// kept temporarily so nothing breaks mid-migration, dropped in the
    /// contract phase once the frontend no longer reads it.
    /// </summary>
    public string? SubCategory { get; set; }

    public string Description { get; set; } = null!;

    public string ShortDescription { get; set; } = null!;

    public string Fabric { get; set; } = null!;

    public string WorkDetails { get; set; } = null!;

    public string? BlouseDetails { get; set; }

    public string? DupattaDetails { get; set; }

    public string AvailableSizes { get; set; } = null!;

    public decimal Price { get; set; }

    public decimal? CompareAtPrice { get; set; }

    public string Currency { get; set; } = null!;

    public decimal Rating { get; set; }

    public int ReviewCount { get; set; }

    public string StockStatus { get; set; } = null!;

    public bool IsBestseller { get; set; }

    public bool IsNewArrival { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsBridal { get; set; }

    public string CareInstructions { get; set; } = null!;

    public int DeliveryStandardDays { get; set; }

    public int? DeliveryExpressDays { get; set; }

    public int? WeightGrams { get; set; }

    public string Tags { get; set; } = null!;

    public string? SeoTitle { get; set; }

    public string? SeoDescription { get; set; }

    public string? SeoKeywords { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual Category Category { get; set; } = null!;

    public virtual Brand Brand { get; set; } = null!;

    public virtual ICollection<CustomizationOption> CustomizationOptions { get; set; } = new List<CustomizationOption>();

    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<WishlistItem> WishlistItems { get; set; } = new List<WishlistItem>();

    public virtual ICollection<Occasion> Occasions { get; set; } = new List<Occasion>();
}
