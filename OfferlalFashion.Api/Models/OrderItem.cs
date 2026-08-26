using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class OrderItem
{
    public int Id { get; set; }

    public string OrderId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string ImageUrl { get; set; } = null!;

    public string Sku { get; set; } = null!;

    public string Size { get; set; } = null!;

    public string Color { get; set; } = null!;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    public string? Customizations { get; set; }

    public virtual Order Order { get; set; } = null!;
}
