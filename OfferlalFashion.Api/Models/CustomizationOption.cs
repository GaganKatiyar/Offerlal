using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class CustomizationOption
{
    public string Id { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string Type { get; set; } = null!;

    public string Label { get; set; } = null!;

    public decimal PriceDelta { get; set; }

    public string? Description { get; set; }

    public virtual Product Product { get; set; } = null!;
}
