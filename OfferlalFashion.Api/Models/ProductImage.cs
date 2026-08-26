using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ProductImage
{
    public string Id { get; set; } = null!;

    public string VariantId { get; set; } = null!;

    public string Url { get; set; } = null!;

    public string Alt { get; set; } = null!;

    public bool IsPrimary { get; set; }

    public int SortOrder { get; set; }

    public virtual ProductVariant Variant { get; set; } = null!;
}
