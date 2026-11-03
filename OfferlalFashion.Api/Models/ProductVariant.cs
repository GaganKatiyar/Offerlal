using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ProductVariant
{
    public string Id { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string Color { get; set; } = null!;

    public string ColorHex { get; set; } = null!;

    /// <summary>
    /// Canonical colour option. Color/ColorHex stay authoritative for display,
    /// but this FK is what the facet projection reads — so "Rani Pink" and
    /// "Magenta" (identical hex in the source data) can be reconciled to one
    /// filterable identity instead of silently diverging.
    /// </summary>
    public int? ColorOptionId { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual AttributeOption? ColorOption { get; set; }

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductSku> ProductSkus { get; set; } = new List<ProductSku>();
}
