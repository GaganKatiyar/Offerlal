namespace OfferlalFashion.Api.Models;

/// <summary>
/// One image in the media library — the single place a picture is described.
///
/// Before this, every image was a raw URL pasted into whichever column needed
/// it: ProductImages.Url, Categories.HeroImageUrl/ThumbnailUrl,
/// Occasions.ImageUrl, Brands.LogoUrl. That has three costs which all grow
/// with the catalogue:
///
///   1. No reuse. 166 image references in this catalogue point at just 74
///      distinct pictures, and nothing knew they were the same picture.
///   2. No alt text worth the name. Alt was derived from the product name, so
///      the same photo described itself differently on every page and screen
///      reader users got the product title read twice.
///   3. The URL shape is load-bearing but unowned. Changing it later means a
///      data migration plus a CDN purge plus broken external and social links.
///
/// Assets are either OWNED (uploaded here, StorageKey set, derivatives
/// generated) or EXTERNAL (StorageKey null, Url points elsewhere). The demo
/// catalogue is entirely external stock photography; keeping those catalogued
/// rather than downloaded means the library is real from day one without
/// pretending we host images we do not.
/// </summary>
public partial class MediaAsset
{
    public int Id { get; set; }

    /// <summary>
    /// Path within the storage backend, e.g. "2026/09/a1b2c3d4.webp".
    /// Null for external assets, which is what distinguishes the two kinds.
    /// </summary>
    public string? StorageKey { get; set; }

    /// <summary>
    /// Canonical URL. For owned assets a site-relative path; for external
    /// assets the absolute URL. Unique, which is what makes the backfill
    /// deduplicating rather than duplicating.
    /// </summary>
    public string Url { get; set; } = null!;

    /// <summary>Where an external asset came from, kept for provenance.</summary>
    public string? SourceUrl { get; set; }

    public string ContentType { get; set; } = "image/jpeg";

    public int? Width { get; set; }
    public int? Height { get; set; }
    public long? Bytes { get; set; }

    /// <summary>
    /// Describes the PICTURE, not the product it happens to illustrate.
    /// Authored once here rather than derived per usage.
    /// </summary>
    public string? AltText { get; set; }

    /// <summary>Admin browsing/grouping, e.g. "products", "categories", "banners".</summary>
    public string Folder { get; set; } = "uploads";

    /// <summary>Free-text search tags for the admin picker.</summary>
    public string? Tags { get; set; }

    /// <summary>
    /// Generated derivative widths as CSV, e.g. "480,800,1600".
    ///
    /// A CSV column rather than a child table: the widths are a fixed policy
    /// set, derivative URLs follow a convention from StorageKey, and a table
    /// would add a join to every read for data that is never queried
    /// independently. Empty for external assets, whose host does its own
    /// resizing.
    /// </summary>
    public string? DerivativeWidths { get; set; }

    /// <summary>Content hash, so re-uploading the same file reuses the asset.</summary>
    public string? ChecksumSha256 { get; set; }

    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();
}
