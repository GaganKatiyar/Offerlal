using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class CartItemCustomization
{
    public int Id { get; set; }

    public string CartItemId { get; set; } = null!;

    public string OptionId { get; set; } = null!;

    public string Label { get; set; } = null!;

    public decimal PriceDelta { get; set; }

    public virtual CartItem CartItem { get; set; } = null!;
}
