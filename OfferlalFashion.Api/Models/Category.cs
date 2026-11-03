using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Category
{
    public string Id { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string HeroImageUrl { get; set; } = null!;

    /// <summary>Library asset for the hero image. See MediaAsset.</summary>
    public int? HeroImageAssetId { get; set; }

    public string ThumbnailUrl { get; set; } = null!;

    /// <summary>Library asset for the thumbnail. See MediaAsset.</summary>
    public int? ThumbnailAssetId { get; set; }

    public string? ParentId { get; set; }

    public int DisplayOrder { get; set; }

    /// <summary>
    /// Materialised path, e.g. "/cat-bridal-lehengas/cat-heavy-bridal/".
    /// Lets "this category and all its descendants" be a single indexable
    /// LIKE predicate, which both the PLP and category-scoped offers need.
    /// An adjacency list alone cannot answer that in one seek.
    /// Maintained by the application on save; recomputed for the subtree on reparent.
    /// </summary>
    public string Path { get; set; } = "";

    /// <summary>Depth in the tree. Roots are 0.</summary>
    public byte Level { get; set; }

    public bool IsActive { get; set; } = true;

    public string? SeoTitle { get; set; }

    public string? SeoDescription { get; set; }

    public string? SeoKeywords { get; set; }

    public virtual ICollection<Category> InverseParent { get; set; } = new List<Category>();

    public virtual Category? Parent { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();
}
