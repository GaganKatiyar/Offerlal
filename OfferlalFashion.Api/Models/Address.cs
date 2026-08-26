using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Address
{
    public string Id { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public string Label { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string Line1 { get; set; } = null!;

    public string? Line2 { get; set; }

    public string City { get; set; } = null!;

    public string State { get; set; } = null!;

    public string Pincode { get; set; } = null!;

    public bool IsDefault { get; set; }

    public virtual Customer Customer { get; set; } = null!;
}
