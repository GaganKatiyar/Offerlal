using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ProductSku
{
    public string Sku { get; set; } = null!;

    public string VariantId { get; set; } = null!;

    public string Size { get; set; } = null!;

    /// <summary>
    /// Canonical size option. Sizes span four incompatible schemes in this
    /// catalogue (apparel XS-XL, kids 2-3Y.., footwear 36-41, dupatta lengths),
    /// so they are separate attributes rather than one flat list.
    /// </summary>
    public int? SizeOptionId { get; set; }

    public int Stock { get; set; }

    public int ReservedStock { get; set; }

    public virtual ProductVariant Variant { get; set; } = null!;

    public virtual AttributeOption? SizeOption { get; set; }
}
