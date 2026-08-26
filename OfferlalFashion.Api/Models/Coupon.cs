using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Coupon
{
    public string Id { get; set; } = null!;

    public string Code { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string Type { get; set; } = null!;

    public decimal Value { get; set; }

    public decimal? MinOrderValue { get; set; }

    public decimal? MaxDiscount { get; set; }

    public DateTime ValidFrom { get; set; }

    public DateTime ValidTo { get; set; }

    public int? UsageLimit { get; set; }

    public int UsedCount { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<Category> Categories { get; set; } = new List<Category>();
}
