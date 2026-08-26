using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class OrderStatusHistory
{
    public int Id { get; set; }

    public string OrderId { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime Timestamp { get; set; }

    public string? Note { get; set; }

    public virtual Order Order { get; set; } = null!;
}
