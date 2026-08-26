using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ProductVariant
{
    public string Id { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string Color { get; set; } = null!;

    public string ColorHex { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    public virtual ICollection<ProductSku> ProductSkus { get; set; } = new List<ProductSku>();
}
