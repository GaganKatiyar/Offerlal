namespace OfferlalFashion.Api.Models;

/// <summary>
/// A navigation menu — header, footer column set, or the mobile drawer.
///
/// The header's seven links were a NAV_LINKS constant in header.ts with
/// hardcoded labels, URLs and emoji icons, and were NOT derived from the
/// category tree. Renaming a category therefore left the nav pointing at a
/// stale label or a dead URL, and adding one meant a deploy.
/// </summary>
public partial class NavMenu
{
    public int Id { get; set; }

    /// <summary>header | footer | mobile</summary>
    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public virtual ICollection<NavItem> Items { get; set; } = new List<NavItem>();
}

/// <summary>
/// One entry in a menu. Self-referencing, at most three levels deep:
/// tab → column group → link.
///
/// Depth is capped deliberately. A mega menu is a fixed visual shape, and an
/// unbounded tree lets an admin build something the frontend cannot draw.
/// </summary>
public partial class NavItem
{
    public int Id { get; set; }
    public int MenuId { get; set; }
    public int? ParentId { get; set; }

    public string Label { get; set; } = null!;

    /// <summary>
    /// Explicit URL. Left null when CategoryId or OccasionId is set, so the
    /// link resolves from the entity's own slug — rename the category and the
    /// nav follows instead of breaking.
    /// </summary>
    public string? Url { get; set; }

    public string? CategoryId { get; set; }
    public string? OccasionId { get; set; }

    public int? MediaAssetId { get; set; }

    /// <summary>Legacy emoji or icon key, until the icon set is a real asset.</summary>
    public string? IconName { get; set; }

    /// <summary>Which mega-menu column this item sits in.</summary>
    public byte ColumnIndex { get; set; }

    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>Renders in the brand accent, e.g. "Sale".</summary>
    public bool IsHighlighted { get; set; }

    public string? BadgeText { get; set; }

    public DateTime? StartsAtUtc { get; set; }
    public DateTime? EndsAtUtc { get; set; }

    public virtual NavMenu Menu { get; set; } = null!;
    public virtual NavItem? Parent { get; set; }
    public virtual ICollection<NavItem> Children { get; set; } = new List<NavItem>();
    public virtual Category? Category { get; set; }
    public virtual Occasion? Occasion { get; set; }
    public virtual MediaAsset? MediaAsset { get; set; }
}

/// <summary>
/// A store-wide setting.
///
/// Replaces values duplicated across components: the free-shipping threshold
/// (₹2,999), flat shipping (₹150) and express (₹250) each appeared in three
/// places, and the WhatsApp number in three more. Three copies of a number
/// means two of them are eventually wrong.
///
/// Typed by ValueType so the admin form can render the right control and the
/// reader can parse without guessing.
/// </summary>
public partial class StoreSetting
{
    public string Key { get; set; } = null!;
    public string? Value { get; set; }

    /// <summary>string | int | decimal | bool | json</summary>
    public string ValueType { get; set; } = "string";

    /// <summary>Groups settings into admin sections, e.g. "shipping", "contact".</summary>
    public string Group { get; set; } = "general";

    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; }
}
