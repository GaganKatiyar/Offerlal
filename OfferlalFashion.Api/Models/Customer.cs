using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Customer
{
    public string Id { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string LastName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string? City { get; set; }

    public string? State { get; set; }

    public DateTime RegisteredAt { get; set; }

    public string Segment { get; set; } = null!;

    public int TotalOrders { get; set; }

    public decimal TotalSpend { get; set; }

    public string? AvatarUrl { get; set; }

    /// <summary>
    /// When the customer's email was confirmed via the code sent at
    /// registration. Null means unverified — the account is still usable
    /// (orders and browsing are not gated on this), so this is informational
    /// for now, surfaced as a banner rather than a block.
    /// </summary>
    public DateTime? EmailVerifiedAt { get; set; }

    public virtual ICollection<Address> Addresses { get; set; } = new List<Address>();

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual SizeProfile? SizeProfile { get; set; }

    public virtual ICollection<WishlistItem> WishlistItems { get; set; } = new List<WishlistItem>();
}
