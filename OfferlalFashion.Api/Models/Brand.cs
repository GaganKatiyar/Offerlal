namespace OfferlalFashion.Api.Models;

/// <summary>
/// A brand is a first-class entity rather than a product attribute: it needs its
/// own landing page (/brand/{slug}), logo, banner and SEO metadata, and it is a
/// targetable condition for offers. An attribute option could give a filter but
/// none of the rest, and could not be retrofitted into one cleanly.
/// </summary>
public partial class Brand
{
    public int Id { get; set; }

    public string Slug { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Description { get; set; } = "";

    public string? LogoUrl { get; set; }

    public string? BannerUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; }

    public string? SeoTitle { get; set; }

    public string? SeoDescription { get; set; }

    public string? SeoKeywords { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
