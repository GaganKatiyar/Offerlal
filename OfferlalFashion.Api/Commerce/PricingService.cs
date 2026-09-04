using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;

namespace OfferlalFashion.Api.Commerce;

/// <summary>What the client is allowed to say about a line. Notably: no price.</summary>
public sealed record QuoteLineRequest
{
    public string ProductId { get; init; } = "";
    public string VariantId { get; init; } = "";
    public string Size { get; init; } = "";
    public int Quantity { get; init; } = 1;

    /// <summary>Ids of chosen customisation options; their charges are looked up.</summary>
    public IReadOnlyList<string> CustomizationIds { get; init; } = [];
}

public sealed record QuoteRequest
{
    public IReadOnlyList<QuoteLineRequest> Lines { get; init; } = [];
    public string? CouponCode { get; init; }
    public bool ExpressDelivery { get; init; }
}

public sealed record QuoteLine
{
    public string ProductId { get; init; } = "";
    public string VariantId { get; init; } = "";
    public string Sku { get; init; } = "";
    public string Name { get; init; } = "";
    public string Size { get; init; } = "";
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal CustomizationTotal { get; init; }
    public decimal LineTotal { get; init; }
    public int AvailableStock { get; init; }
    public bool InStock { get; init; }

    /// <summary>
    /// Snapshotted onto the order item so a historical order still renders
    /// correctly after the product is renamed, recoloured or deleted.
    /// </summary>
    public string? ImageUrl { get; init; }
    public string? Color { get; init; }
}

public sealed record Quote
{
    public IReadOnlyList<QuoteLine> Lines { get; init; } = [];
    public decimal Subtotal { get; init; }
    public decimal Discount { get; init; }
    public decimal ShippingFee { get; init; }
    public decimal Total { get; init; }

    /// <summary>
    /// GST contained WITHIN the total, not added to it. Catalogue prices are
    /// MRP inclusive of tax — the PDP says so — and adding tax on top would
    /// silently change what every customer pays.
    /// </summary>
    public decimal TaxIncluded { get; init; }

    public string? CouponCode { get; init; }
    public string? CouponMessage { get; init; }
    public bool CouponApplied { get; init; }

    /// <summary>Populated when a line cannot be fulfilled. A quote with problems must not be charged.</summary>
    public IReadOnlyList<string> Problems { get; init; } = [];

    public bool IsFulfillable => Problems.Count == 0;
}

/// <summary>
/// The single authority on what an order costs.
///
/// Replaces pricing computed in the browser, where the client sent its own
/// `discount` and the server stored whatever arrived. Anyone could set a
/// discount equal to the subtotal and check out for the price of shipping.
///
/// Everything here is looked up server-side from the catalogue: unit prices,
/// customisation charges, coupon rules, shipping thresholds and stock. The
/// client sends WHAT it wants, never WHAT IT COSTS.
///
/// Deliberately a pure computation over database state, with no side effects,
/// so the same method backs the live cart total, the checkout summary and the
/// order that is finally written — three numbers that must never disagree.
/// </summary>
public sealed class PricingService(OfferlalFashionDbContext db)
{
    /// <summary>
    /// GST rates for MRP-inclusive pricing.
    ///
    /// Indian apparel is 5% at or below ₹1,000 and 12% above; these are the
    /// commonly applied slabs and MUST be confirmed against the business's own
    /// GST registration before going live. They affect the invoice breakdown
    /// only, never the amount charged, because the price is already inclusive.
    /// </summary>
    private const decimal ApparelLowRate = 0.05m;
    private const decimal ApparelHighRate = 0.12m;
    private const decimal LowRateThreshold = 1000m;

    public async Task<Quote> QuoteAsync(QuoteRequest request, CancellationToken ct = default)
    {
        var problems = new List<string>();
        var lines = new List<QuoteLine>();

        if (request.Lines.Count == 0)
        {
            return new Quote { Problems = ["Your bag is empty."] };
        }

        foreach (var requested in request.Lines)
        {
            if (requested.Quantity <= 0)
            {
                problems.Add("Quantity must be at least 1.");
                continue;
            }

            var product = await db.Products.AsNoTracking()
                .Include(p => p.CustomizationOptions)
                .FirstOrDefaultAsync(p => p.Id == requested.ProductId, ct);

            if (product is null)
            {
                problems.Add($"A product in your bag is no longer available.");
                continue;
            }

            var sku = await db.ProductSkus.AsNoTracking()
                .FirstOrDefaultAsync(s => s.VariantId == requested.VariantId && s.Size == requested.Size, ct);

            var variant = await db.ProductVariants.AsNoTracking()
                .Include(v => v.ProductImages)
                .FirstOrDefaultAsync(v => v.Id == requested.VariantId, ct);

            if (sku is null)
            {
                problems.Add($"{product.Name} is not available in size {requested.Size}.");
                continue;
            }

            // Available means unreserved. Counting reserved units as available
            // is how two shoppers buy the same last item.
            var available = sku.Stock - sku.ReservedStock;

            if (available < requested.Quantity)
            {
                problems.Add(available <= 0
                    ? $"{product.Name} (size {requested.Size}) is out of stock."
                    : $"Only {available} left of {product.Name} (size {requested.Size}).");
            }

            // Customisation charges come from the product's OWN options, so a
            // client cannot claim an option that belongs to another product or
            // invent a negative charge.
            var customisation = product.CustomizationOptions
                .Where(o => requested.CustomizationIds.Contains(o.Id))
                .Sum(o => o.PriceDelta);

            var unit = product.Price + customisation;

            lines.Add(new QuoteLine
            {
                ProductId = product.Id,
                VariantId = requested.VariantId,
                Sku = sku.Sku,
                Name = product.Name,
                Size = requested.Size,
                Quantity = requested.Quantity,
                UnitPrice = product.Price,
                CustomizationTotal = customisation * requested.Quantity,
                LineTotal = unit * requested.Quantity,
                AvailableStock = available,
                InStock = available >= requested.Quantity,
                Color = variant?.Color,
                ImageUrl = variant?.ProductImages
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.SortOrder)
                    .Select(i => i.Url)
                    .FirstOrDefault(),
            });
        }

        var subtotal = lines.Sum(l => l.LineTotal);

        var (discount, couponApplied, couponMessage) =
            await ApplyCouponAsync(request.CouponCode, subtotal, lines, ct);

        var shipping = await ShippingFeeAsync(subtotal - discount, request.ExpressDelivery, ct);
        var total = subtotal - discount + shipping;

        return new Quote
        {
            Lines = lines,
            Subtotal = subtotal,
            Discount = discount,
            ShippingFee = shipping,
            Total = total,
            TaxIncluded = InclusiveTax(subtotal - discount),
            CouponCode = couponApplied ? request.CouponCode?.Trim().ToUpperInvariant() : null,
            CouponMessage = couponMessage,
            CouponApplied = couponApplied,
            Problems = problems,
        };
    }

    /// <summary>
    /// Validates and applies a coupon. Ported from the storefront's
    /// coupon.service.ts, whose rule evaluation was sound — it was simply
    /// running somewhere the customer could edit.
    /// </summary>
    private async Task<(decimal Discount, bool Applied, string? Message)> ApplyCouponAsync(
        string? code,
        decimal subtotal,
        List<QuoteLine> lines,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code)) return (0m, false, null);

        var normalised = code.Trim().ToUpperInvariant();
        var coupon = await db.Coupons.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Code.ToUpper() == normalised, ct);

        if (coupon is null) return (0m, false, "Coupon code not found.");
        if (!coupon.IsActive) return (0m, false, "This coupon is no longer active.");

        var now = DateTime.UtcNow;
        if (now < coupon.ValidFrom || now > coupon.ValidTo)
        {
            return (0m, false, "This coupon has expired or is not yet active.");
        }

        if (coupon.UsageLimit is not null && coupon.UsedCount >= coupon.UsageLimit)
        {
            return (0m, false, "This coupon has reached its usage limit.");
        }

        if (coupon.MinOrderValue is not null && subtotal < coupon.MinOrderValue)
        {
            var shortfall = coupon.MinOrderValue.Value - subtotal;
            return (0m, false, $"Add items worth {shortfall:N0} more to use this coupon.");
        }

        decimal discount = coupon.Type switch
        {
            "percent" => Math.Round(subtotal * coupon.Value / 100m, 0, MidpointRounding.AwayFromZero),
            "flat" => coupon.Value,
            _ => 0m,
        };

        if (coupon.Type == "percent" && coupon.MaxDiscount is not null)
        {
            discount = Math.Min(discount, coupon.MaxDiscount.Value);
        }

        // A discount can never exceed the subtotal. Without this a large flat
        // coupon on a small bag produces a negative total, which downstream
        // becomes a refund the customer never paid for.
        discount = Math.Clamp(discount, 0m, subtotal);

        return (discount, true, $"{coupon.Code} applied successfully!");
    }

    private async Task<decimal> ShippingFeeAsync(decimal payable, bool express, CancellationToken ct)
    {
        var settings = await db.StoreSettings.AsNoTracking()
            .Where(s => s.Group == "shipping")
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        decimal Read(string key, decimal fallback) =>
            settings.TryGetValue(key, out var raw) && decimal.TryParse(raw, out var value) ? value : fallback;

        var threshold = Read("shipping.freeThreshold", 2999m);
        var flat = Read("shipping.flatFee", 150m);
        var expressFee = Read("shipping.expressFee", 250m);

        if (express) return expressFee;
        return payable >= threshold ? 0m : flat;
    }

    /// <summary>
    /// The GST component already contained in an inclusive price:
    /// tax = gross × rate / (1 + rate).
    /// </summary>
    private static decimal InclusiveTax(decimal gross)
    {
        if (gross <= 0) return 0m;
        var rate = gross <= LowRateThreshold ? ApparelLowRate : ApparelHighRate;
        return Math.Round(gross * rate / (1 + rate), 2, MidpointRounding.AwayFromZero);
    }
}
