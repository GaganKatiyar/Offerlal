namespace OfferlalFashion.Api.Models;

/// <summary>
/// One measurement of one size, e.g. "size M has a 36in bust".
///
/// Replaces a SIZE_CHART constant hardcoded in the storefront's PDP component,
/// which listed bust/waist/hip/shoulder/length for XS-XXL. That was wrong in
/// two ways at once: it was the same chart for every product, and it was an
/// apparel chart shown on a catalogue that also sells jewellery and footwear.
/// A choker offered a bust measurement.
///
/// Keyed on the SIZE ATTRIBUTE rather than the category, because the size
/// scheme is what a chart actually describes. The catalogue has four
/// incompatible schemes (apparel, kids, footwear, dupatta lengths) and each
/// needs its own measurements, while every apparel product can share one chart.
///
/// A product shows a size guide only when rows exist for its scheme. Nothing
/// needs to know that jewellery has no chart — it simply has no rows, so the
/// link does not render.
/// </summary>
public partial class SizeChartMeasurement
{
    public int Id { get; set; }

    /// <summary>Which size scheme, e.g. the "size-apparel" attribute.</summary>
    public int AttributeId { get; set; }

    /// <summary>Which size within that scheme, e.g. the "M" option.</summary>
    public int OptionId { get; set; }

    /// <summary>Stable key, e.g. "bust", "waist", "foot-length".</summary>
    public string Code { get; set; } = null!;

    /// <summary>Column heading, e.g. "Bust".</summary>
    public string Label { get; set; } = null!;

    public decimal Value { get; set; }

    /// <summary>in | cm — kept per row so a chart can mix units if it must.</summary>
    public string Unit { get; set; } = "in";

    public int DisplayOrder { get; set; }

    public virtual CatalogAttribute Attribute { get; set; } = null!;
    public virtual AttributeOption Option { get; set; } = null!;
}
