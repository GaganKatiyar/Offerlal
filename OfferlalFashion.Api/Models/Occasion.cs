using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Occasion
{
    public string Id { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string ImageUrl { get; set; } = null!;

    /// <summary>Library asset for the occasion image. See MediaAsset.</summary>
    public int? ImageAssetId { get; set; }

    public string Description { get; set; } = null!;

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
