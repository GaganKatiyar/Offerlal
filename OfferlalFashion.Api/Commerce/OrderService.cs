using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Commerce;

public sealed record PlaceOrderRequest
{
    public IReadOnlyList<QuoteLineRequest> Lines { get; init; } = [];
    public string? CouponCode { get; init; }
    public bool ExpressDelivery { get; init; }

    public string CustomerId { get; init; } = "";
    public string PaymentMethod { get; init; } = "COD";

    public string ShippingName { get; init; } = "";
    public string ShippingPhone { get; init; } = "";
    public string ShippingLine1 { get; init; } = "";
    public string? ShippingLine2 { get; init; }
    public string ShippingCity { get; init; } = "";
    public string ShippingState { get; init; } = "";
    public string ShippingPincode { get; init; } = "";
}

public sealed record PlaceOrderResult(bool Success, string? OrderNumber, decimal Total, IReadOnlyList<string> Problems);

/// <summary>
/// Places orders. The one path by which stock moves and money is owed.
///
/// Three things were wrong before, all of them in the browser:
///   - Totals were computed client-side and `discount` was accepted from the
///     request, so a customer could pay whatever they liked.
///   - paymentStatus was set to "Paid" for every non-COD order without any
///     payment having happened.
///   - Nothing decremented stock, so overselling was certain.
/// </summary>
public sealed class OrderService(
    OfferlalFashionDbContext db,
    PricingService pricing,
    ILogger<OrderService> log)
{
    public async Task<PlaceOrderResult> PlaceAsync(PlaceOrderRequest request, CancellationToken ct = default)
    {
        // The quote is recomputed here from the catalogue. Whatever the client
        // believed the price to be is not read, not compared and not stored.
        var quote = await pricing.QuoteAsync(new QuoteRequest
        {
            Lines = request.Lines,
            CouponCode = request.CouponCode,
            ExpressDelivery = request.ExpressDelivery,
        }, ct);

        if (!quote.IsFulfillable)
        {
            return new PlaceOrderResult(false, null, 0m, quote.Problems);
        }

        // The context is configured with EnableRetryOnFailure, and a retrying
        // execution strategy refuses user-initiated transactions outright — it
        // cannot replay a transaction it did not open. So the whole unit of
        // work is handed to the strategy, which owns the retry boundary.
        var strategy = db.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            // Serializable: two concurrent checkouts for the last unit must not
            // both read stock of 1 and both succeed. This is the difference
            // between a stock check and a stock guarantee.
            await using var tx = await db.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable, ct);

            try
            {
                var problems = new List<string>();
                var skus = new Dictionary<string, ProductSku>();

                foreach (var line in quote.Lines)
                {
                    var sku = await db.ProductSkus.FirstOrDefaultAsync(s => s.Sku == line.Sku, ct);
                    if (sku is null)
                    {
                        problems.Add($"{line.Name} is no longer available.");
                        continue;
                    }

                    // Re-checked inside the transaction. The quote's check was
                    // advisory; this one is binding.
                    if (sku.Stock - sku.ReservedStock < line.Quantity)
                    {
                        problems.Add($"{line.Name} (size {line.Size}) sold out while you were checking out.");
                        continue;
                    }

                    skus[line.Sku] = sku;
                }

                if (problems.Count > 0)
                {
                    await tx.RollbackAsync(ct);
                    return new PlaceOrderResult(false, null, 0m, problems);
                }

                var orderNumber = await NextOrderNumberAsync(ct);

                var order = new Order
                {
                    Id = $"ord-{Guid.NewGuid():N}"[..20],
                    OrderNumber = orderNumber,
                    CustomerId = request.CustomerId,
                    Status = "Placed",
                    Subtotal = quote.Subtotal,
                    Discount = quote.Discount,
                    ShippingFee = quote.ShippingFee,
                    Tax = quote.TaxIncluded,
                    Total = quote.Total,
                    PaymentMethod = request.PaymentMethod,

                    // NEVER "Paid" here. Only a verified gateway webhook may say
                    // that. Marking an order paid at placement time is how a store
                    // ships goods nobody paid for.
                    PaymentStatus = "Pending",

                    CouponCode = quote.CouponCode,
                    PlacedAt = DateTime.UtcNow,
                    ShipFullName = request.ShippingName,
                    ShipPhone = request.ShippingPhone,
                    ShipLine1 = request.ShippingLine1,
                    ShipLine2 = request.ShippingLine2,
                    ShipCity = request.ShippingCity,
                    ShipState = request.ShippingState,
                    ShipPincode = request.ShippingPincode,

                    // Billing mirrors shipping unless a separate address is
                    // supplied. The columns are non-nullable, so leaving them empty
                    // would fail on write rather than default sensibly.
                    BillFullName = request.ShippingName,
                    BillPhone = request.ShippingPhone,
                    BillLine1 = request.ShippingLine1,
                    BillLine2 = request.ShippingLine2,
                    BillCity = request.ShippingCity,
                    BillState = request.ShippingState,
                    BillPincode = request.ShippingPincode,
                };

                db.Orders.Add(order);
                await db.SaveChangesAsync(ct);

                foreach (var line in quote.Lines)
                {
                    var sku = skus[line.Sku];

                    db.OrderItems.Add(new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = line.ProductId,
                        Sku = line.Sku,
                        Name = line.Name,
                        ImageUrl = line.ImageUrl ?? string.Empty,
                        Size = line.Size,
                        Color = line.Color ?? string.Empty,
                        Quantity = line.Quantity,
                        UnitPrice = line.UnitPrice,
                        LineTotal = line.LineTotal,
                    });

                    sku.Stock -= line.Quantity;

                    db.StockLedger.Add(new StockLedgerEntry
                    {
                        Sku = line.Sku,
                        QuantityChange = -line.Quantity,
                        BalanceAfter = sku.Stock,
                        Reason = StockMovementReason.OrderPlaced,
                        Reference = orderNumber,
                        CreatedAtUtc = DateTime.UtcNow,
                    });
                }

                if (quote.CouponApplied && quote.CouponCode is not null)
                {
                    var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == quote.CouponCode, ct);
                    if (coupon is not null) coupon.UsedCount += 1;
                }

                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                log.LogInformation(
                    "Order {OrderNumber} placed for {Total} ({Lines} lines)",
                    orderNumber, quote.Total, quote.Lines.Count);

                return new PlaceOrderResult(true, orderNumber, quote.Total, []);
            }
            catch (Microsoft.Data.SqlClient.SqlException ex) when (IsConcurrencyConflict(ex))
            {
                // Two checkouts raced for the same unit and the database broke
                // the tie. That is the isolation level doing its job, not a
                // fault — so the loser is told the item just sold out rather
                // than being shown an unexplained 500.
                await tx.RollbackAsync(ct);
                log.LogInformation("Checkout lost a concurrency race (SQL {Number}); reporting as sold out", ex.Number);
                return new PlaceOrderResult(false, null, 0m,
                    ["An item in your bag just sold out. Please review your bag and try again."]);
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        });
    }

    /// <summary>
    /// 1205 is a deadlock victim; 3960 and 41302 are snapshot/serializable
    /// write conflicts. All three mean "someone else won the race", which is an
    /// expected outcome under Serializable rather than an error.
    /// </summary>
    private static bool IsConcurrencyConflict(Microsoft.Data.SqlClient.SqlException ex) =>
        ex.Number is 1205 or 3960 or 41302;

    /// <summary>
    /// Next order number.
    ///
    /// Derived from the highest existing number for the year rather than a row
    /// count. The count version produced duplicates the moment an order was
    /// deleted, and raced under concurrency — two simultaneous checkouts read
    /// the same count and produced the same number.
    /// </summary>
    private async Task<string> NextOrderNumberAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"OF-{year}-";

        var highest = await db.Orders
            .Where(o => o.OrderNumber.StartsWith(prefix))
            .Select(o => o.OrderNumber)
            .ToListAsync(ct);

        var next = highest
            .Select(n => int.TryParse(n[prefix.Length..], out var v) ? v : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{next:D5}";
    }
}
