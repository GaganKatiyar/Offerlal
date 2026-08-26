using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class CartItem
{
    public string Id { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string VariantId { get; set; } = null!;

    public string Sku { get; set; } = null!;

    public string Size { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public DateTime AddedAt { get; set; }

    public virtual ICollection<CartItemCustomization> CartItemCustomizations { get; set; } = new List<CartItemCustomization>();

    public virtual Customer Customer { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
