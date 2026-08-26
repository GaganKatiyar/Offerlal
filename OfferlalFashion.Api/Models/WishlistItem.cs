using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class WishlistItem
{
    public string Id { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public DateTime AddedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;
}
