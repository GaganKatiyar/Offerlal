namespace OfferlalFashion.Api.Models;

/// <summary>
/// The dynamic product-attribute system.
///
/// Attributes are split by ROLE, not by data type:
///   - Facetable  -> ProductAttributeOptions, an INT-keyed junction to curated
///                   options. Never free text in the value slot. This is what
///                   avoids the classic EAV performance trap: the facet query is
///                   a narrow INT semi-join against a covering index, not a wide
///                   self-join with type coercion.
///   - Numeric    -> ProductAttributeNumbers, for range filters.
///   - Display    -> Products.DisplayAttributesJson. Rendered, never queried.
///
/// Structural attributes (colour, size) stay authoritative on ProductVariants and
/// ProductSkus and are PROJECTED into ProductAttributeOptions on save, so the PLP
/// has exactly one query shape for every attribute in the system.
///
/// Named CatalogAttribute rather than Attribute to avoid colliding with System.Attribute.
/// </summary>

/// <summary>A PDP accordion section, e.g. "Fabric &amp; Material".</summary>
public partial class AttributeGroup
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public int DisplayOrder { get; set; }

    public virtual ICollection<CatalogAttribute> Attributes { get; set; } = new List<CatalogAttribute>();
}

/// <summary>How an attribute's value is stored.</summary>
public static class AttributeValueKind
{
    public const string Option = "Option";
    public const string Number = "Number";
    public const string Text   = "Text";
    public const string Bool   = "Bool";
}

/// <summary>Which entity level an attribute belongs to.</summary>
public static class AttributeScope
{
    public const string Product = "product";
    public const string Variant = "variant";
    public const string Sku     = "sku";
}

public partial class CatalogAttribute
{
    public int Id { get; set; }

    /// <summary>Stable machine key, e.g. "fabric", "work-type".</summary>
    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public int? GroupId { get; set; }

    /// <summary>Option | Number | Text | Bool — see <see cref="AttributeValueKind"/>.</summary>
    public string ValueKind { get; set; } = AttributeValueKind.Option;

    /// <summary>How admin edits it: select, multiselect, number, text, textarea, swatch, toggle.</summary>
    public string InputType { get; set; } = "select";

    /// <summary>product | variant | sku — see <see cref="AttributeScope"/>.</summary>
    public string Scope { get; set; } = AttributeScope.Product;

    /// <summary>Appears in the PLP filter rail. A DB CHECK forbids this for Text attributes.</summary>
    public bool IsFacetable { get; set; }

    public bool IsSearchable { get; set; }

    public bool ShowOnPdp { get; set; } = true;

    /// <summary>Display unit, e.g. "GB", "ml", "cm".</summary>
    public string? Unit { get; set; }

    public int DisplayOrder { get; set; }

    public virtual AttributeGroup? Group { get; set; }
    public virtual ICollection<AttributeOption> Options { get; set; } = new List<AttributeOption>();
}

/// <summary>A curated, selectable value for an Option-kind attribute.</summary>
public partial class AttributeOption
{
    public int Id { get; set; }
    public int AttributeId { get; set; }

    /// <summary>URL/facet key, e.g. "raw-silk".</summary>
    public string Slug { get; set; } = null!;

    /// <summary>Display value, e.g. "Raw Silk".</summary>
    public string Value { get; set; } = null!;

    /// <summary>Swatch colour for colour-like attributes.</summary>
    public string? ColorHex { get; set; }

    public string? ImageUrl { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual CatalogAttribute Attribute { get; set; } = null!;
}

/// <summary>
/// A vertical template — the set of attributes a product of a given kind has.
/// "ethnic-apparel" today; "beauty" or "electronics" later, with no schema change.
/// </summary>
public partial class AttributeSet
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;

    public virtual ICollection<AttributeSetAttribute> Attributes { get; set; } = new List<AttributeSetAttribute>();
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}

public partial class AttributeSetAttribute
{
    public int AttributeSetId { get; set; }
    public int AttributeId { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }

    public virtual AttributeSet AttributeSet { get; set; } = null!;
    public virtual CatalogAttribute Attribute { get; set; } = null!;
}

/// <summary>
/// The facet projection. Multi-valued by construction — one row per
/// (product, attribute, option). For colour and size this is a projection of
/// ProductVariants/ProductSkus, rebuilt on save; never edited directly.
/// </summary>
public partial class ProductAttributeOption
{
    public string ProductId { get; set; } = null!;
    public int AttributeId { get; set; }
    public int OptionId { get; set; }

    public virtual Product Product { get; set; } = null!;
    public virtual CatalogAttribute Attribute { get; set; } = null!;
    public virtual AttributeOption Option { get; set; } = null!;
}

/// <summary>Range-filterable numeric attribute values.</summary>
public partial class ProductAttributeNumber
{
    public string ProductId { get; set; } = null!;
    public int AttributeId { get; set; }
    public decimal NumericValue { get; set; }

    public virtual Product Product { get; set; } = null!;
    public virtual CatalogAttribute Attribute { get; set; } = null!;
}
