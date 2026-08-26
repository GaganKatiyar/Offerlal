using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class ReviewImage
{
    public int Id { get; set; }

    public string ReviewId { get; set; } = null!;

    public string Url { get; set; } = null!;

    public virtual Review Review { get; set; } = null!;
}
