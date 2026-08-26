using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ProductSku
{
    public string Sku { get; set; } = null!;

    public string VariantId { get; set; } = null!;

    public string Size { get; set; } = null!;

    public int Stock { get; set; }

    public int ReservedStock { get; set; }

    public virtual ProductVariant Variant { get; set; } = null!;
}
