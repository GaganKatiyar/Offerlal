using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Review
{
    public string Id { get; set; } = null!;

    public string ProductId { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string CustomerName { get; set; } = null!;

    public string? CustomerCity { get; set; }

    public byte Rating { get; set; }

    public string Title { get; set; } = null!;

    public string Comment { get; set; } = null!;

    public bool VerifiedPurchase { get; set; }

    public DateTime CreatedAt { get; set; }

    public int HelpfulCount { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual Product Product { get; set; } = null!;

    public virtual ICollection<ReviewImage> ReviewImages { get; set; } = new List<ReviewImage>();
}
