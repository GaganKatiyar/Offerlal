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

    public string ThumbnailUrl { get; set; } = null!;

    public string? ParentId { get; set; }

    public int DisplayOrder { get; set; }

    public string? SeoTitle { get; set; }

    public string? SeoDescription { get; set; }

    public string? SeoKeywords { get; set; }

    public virtual ICollection<Category> InverseParent { get; set; } = new List<Category>();

    public virtual Category? Parent { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();

    public virtual ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();
}
