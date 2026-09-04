namespace OfferlalFashion.Api.Models;

/// <summary>Why stock moved. Every movement has exactly one reason.</summary>
public static class StockMovementReason
{
    public const string OrderPlaced = "OrderPlaced";
    public const string OrderCancelled = "OrderCancelled";
    public const string Returned = "Returned";
    public const string ManualAdjustment = "ManualAdjustment";
    public const string StockReceived = "StockReceived";
    public const string Reservation = "Reservation";
    public const string ReservationReleased = "ReservationReleased";
}

/// <summary>
/// An append-only record of every stock movement.
///
/// Nothing decremented stock before this: the storefront had an adjustStock()
/// that was never called from anywhere, so overselling was guaranteed and there
/// was no history at all.
///
/// Append-only on purpose. Stock history cannot be reconstructed after the
/// fact — if it is not recorded as it happens, that past is simply gone — and
/// "why is this SKU at 3 when we received 10" is a question that only a ledger
/// can answer. The SKU's own Stock column stays as the fast read; this is the
/// explanation behind it.
/// </summary>
public partial class StockLedgerEntry
{
    public long Id { get; set; }

    public string Sku { get; set; } = null!;

    /// <summary>Signed: negative for a sale, positive for a return or receipt.</summary>
    public int QuantityChange { get; set; }

    /// <summary>Stock level AFTER this movement, so a discrepancy is traceable to one row.</summary>
    public int BalanceAfter { get; set; }

    /// <summary>See <see cref="StockMovementReason"/>.</summary>
    public string Reason { get; set; } = null!;

    /// <summary>Order number, adjustment note, or similar.</summary>
    public string? Reference { get; set; }

    public string? Note { get; set; }

    /// <summary>Who caused it: an admin username, or null for a customer action.</summary>
    public string? ActorId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual ProductSku SkuNavigation { get; set; } = null!;
}
