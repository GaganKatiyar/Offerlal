namespace OfferlalFashion.Api.Models;

/// <summary>
/// The dynamic content system.
///
/// The homepage was ten hardcoded &lt;section&gt; blocks. Their order WAS the
/// template order, every eyebrow and heading was literal markup, and the
/// curation lived in TypeScript constants. Changing which rail appeared first,
/// or the wording above it, meant a code change and a deploy.
///
/// The shape here is deliberately in between the two obvious options:
///
///   - Table-per-section-type would mean a new table, admin form, endpoint and
///     deploy for every new kind of section.
///   - One untyped JSON blob per section would validate nothing, and deleting a
///     product would silently break the homepage.
///
/// So: common presentational fields are REAL COLUMNS (admin can sort, filter
/// and validate on them), relational content is TYPED CHILD ROWS with nullable
/// FKs (referential integrity means a deleted product cannot leave a dangling
/// rail), and only genuinely type-specific knobs live in a small ConfigJson
/// validated on write against the section type's schema.
///
/// This mirrors AttributeSets, already in this codebase, so it introduces no
/// new mental model.
/// </summary>
public partial class ContentPage
{
    public int Id { get; set; }

    /// <summary>Stable key used in URLs and cache keys, e.g. "home".</summary>
    public string Key { get; set; } = null!;

    public string Name { get; set; } = null!;

    /// <summary>
    /// The revision the public site serves. Publishing flips this pointer, and
    /// rollback flips it back — which is why revisions are snapshots rather
    /// than diffs.
    /// </summary>
    public int? PublishedRevisionId { get; set; }

    public virtual ICollection<PageSection> Sections { get; set; } = new List<PageSection>();
}

/// <summary>
/// The registry of section kinds the frontend can render.
///
/// A row here plus a component in the frontend registry is all a new section
/// type needs. Unknown codes render nothing rather than white-screening, so a
/// type can be added in admin before the frontend supports it.
/// </summary>
public partial class SectionType
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;

    /// <summary>JSON Schema for ConfigJson, validated on write.</summary>
    public string? SchemaJson { get; set; }

    /// <summary>Which ItemKind this type's child rows use, if any.</summary>
    public string? ItemKind { get; set; }

    public int? MaxItems { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

/// <summary>Item kinds a section's child rows can hold.</summary>
public static class SectionItemKind
{
    public const string Product = "Product";
    public const string Category = "Category";
    public const string Occasion = "Occasion";
    public const string Banner = "Banner";
    public const string Editorial = "Editorial";
    public const string Trust = "Trust";
    public const string Link = "Link";
}

public partial class PageSection
{
    public int Id { get; set; }
    public int PageId { get; set; }
    public string SectionTypeCode { get; set; } = null!;

    // Common presentational fields, as columns because admin validates on them.
    public string? Eyebrow { get; set; }
    public string? Heading { get; set; }
    public string? Subheading { get; set; }
    public string? CtaLabel { get; set; }
    public string? CtaUrl { get; set; }

    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Scheduling window, evaluated at render rather than baked out of the
    /// published snapshot — otherwise a scheduled section could never go live
    /// without republishing.
    /// </summary>
    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }

    /// <summary>Optional rule that backfills a product rail after manual pins.</summary>
    public int? ProductRuleId { get; set; }

    /// <summary>
    /// Type-specific knobs. Always carries "v" so the contract can evolve;
    /// retro-versioning JSON already in production is miserable.
    /// </summary>
    public string ConfigJson { get; set; } = "{\"v\":1}";

    public byte[]? RowVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public virtual ContentPage Page { get; set; } = null!;
    public virtual ProductRule? ProductRule { get; set; }
    public virtual ICollection<PageSectionItem> Items { get; set; } = new List<PageSectionItem>();
}

/// <summary>
/// One entry inside a section: a hero slide, a category tile, a trust badge, a
/// pinned product, a UGC photo.
///
/// ONE table for all of them, with typed nullable FKs. That is the anti-blob
/// move that matters most here — a rail that references a deleted product
/// fails at the database rather than rendering a hole on the homepage.
/// </summary>
public partial class PageSectionItem
{
    public int Id { get; set; }
    public int SectionId { get; set; }
    public int DisplayOrder { get; set; }

    /// <summary>See <see cref="SectionItemKind"/>.</summary>
    public string ItemKind { get; set; } = null!;

    public string? ProductId { get; set; }
    public string? CategoryId { get; set; }
    public string? OccasionId { get; set; }

    public int? MediaAssetId { get; set; }

    /// <summary>
    /// Separate mobile crop. A 3:1 desktop banner reframed to a phone is
    /// usually the wrong crop, not just a smaller one.
    /// </summary>
    public int? MediaAssetMobileId { get; set; }

    public string? Title { get; set; }
    public string? Subtitle { get; set; }
    public string? Caption { get; set; }
    public string? BadgeText { get; set; }
    public string? LinkUrl { get; set; }

    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual PageSection Section { get; set; } = null!;
    public virtual Product? Product { get; set; }
    public virtual Category? Category { get; set; }
    public virtual Occasion? Occasion { get; set; }
    public virtual MediaAsset? MediaAsset { get; set; }
    public virtual MediaAsset? MediaAssetMobile { get; set; }
}

/// <summary>
/// A named, reusable product query — "New Arrivals", "Under ₹25,000".
///
/// DefinitionJson is a CONSTRAINED SHAPE translated to an EF query, never
/// arbitrary SQL. Storing executable SQL that an admin form can edit is a
/// one-way door straight into remote code execution.
/// </summary>
public partial class ProductRule
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string DefinitionJson { get; set; } = "{\"v\":1}";
    public int MaxItems { get; set; } = 8;
    public bool IsActive { get; set; } = true;

    public virtual ICollection<PageSection> Sections { get; set; } = new List<PageSection>();
}

/// <summary>
/// A published snapshot of an entire page.
///
/// The public read path serves PayloadJson directly: one row read, no joins,
/// trivially cacheable. Editing writes to the PageSections rows (that IS the
/// draft); publishing composes and stores a snapshot and flips the page's
/// pointer. Rollback is a pointer flip, and the audit trail is free.
///
/// Simpler than a draft/published shadow-table scheme, which doubles every
/// table and every write path.
/// </summary>
public partial class PageRevision
{
    public int Id { get; set; }
    public int PageId { get; set; }
    public string PayloadJson { get; set; } = null!;
    public DateTime PublishedAtUtc { get; set; }
    public string? PublishedBy { get; set; }
    public string? Note { get; set; }

    public virtual ContentPage Page { get; set; } = null!;
}
