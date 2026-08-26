using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class SizeProfile
{
    public string CustomerId { get; set; } = null!;

    public decimal Bust { get; set; }

    public decimal Waist { get; set; }

    public decimal Hip { get; set; }

    public decimal Shoulder { get; set; }

    public decimal BlouseLength { get; set; }

    public decimal SleeveLength { get; set; }

    public decimal Height { get; set; }

    public decimal LehengaLength { get; set; }

    public string Unit { get; set; } = null!;

    public string PreferredSize { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Customer Customer { get; set; } = null!;
}
