using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class BudgetTier
{
    public string Id { get; set; } = null!;

    public string Label { get; set; } = null!;

    public decimal MinPrice { get; set; }

    public decimal? MaxPrice { get; set; }

    public string ImageUrl { get; set; } = null!;
}
