using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ProductImage
{
    public string Id { get; set; } = null!;

    public string VariantId { get; set; } = null!;

    public string Url { get; set; } = null!;

    /// <summary>
    /// The library asset this row points at. Nullable during the migration:
    /// Url stays authoritative until every row is backfilled, after which the
    /// URL columns are dropped and this becomes required.
    /// </summary>
    public int? MediaAssetId { get; set; }

    public string Alt { get; set; } = null!;

    public bool IsPrimary { get; set; }

    public int SortOrder { get; set; }

    public virtual ProductVariant Variant { get; set; } = null!;

    public virtual MediaAsset? MediaAsset { get; set; }
}
