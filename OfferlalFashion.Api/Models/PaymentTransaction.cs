namespace OfferlalFashion.Api.Models;

/// <summary>Where a payment attempt has got to.</summary>
public static class PaymentTransactionStatus
{
    /// <summary>A gateway order exists; the customer has not finished paying.</summary>
    public const string Created = "Created";

    /// <summary>A signature-verified webhook said the money arrived.</summary>
    public const string Captured = "Captured";

    /// <summary>The gateway told us the attempt failed.</summary>
    public const string Failed = "Failed";
}

/// <summary>Payment providers. One today, named rather than assumed.</summary>
public static class PaymentProvider
{
    public const string Razorpay = "Razorpay";
}

/// <summary>
/// One attempt to collect money for an order.
///
/// A separate table rather than columns on Order, because a single order can be
/// paid for several times over: a customer abandons the gateway, retries, has a
/// card declined, retries again. Flattening that onto the order would keep only
/// the last attempt and lose exactly the history anyone investigating a disputed
/// payment needs.
///
/// Nothing here is trusted from the browser. Rows are written when WE ask the
/// gateway to create an order, and updated only from a webhook whose signature
/// has been verified against our own secret.
/// </summary>
public partial class PaymentTransaction
{
    public int Id { get; set; }

    public string OrderId { get; set; } = null!;

    /// <summary>Which gateway. See <see cref="PaymentProvider"/>.</summary>
    public string Provider { get; set; } = null!;

    /// <summary>The gateway's own order id, e.g. Razorpay's "order_XXXX".</summary>
    public string ProviderOrderId { get; set; } = null!;

    /// <summary>
    /// The gateway's payment id, e.g. "pay_XXXX". Null until something is paid —
    /// an order id is not a payment.
    /// </summary>
    public string? ProviderPaymentId { get; set; }

    /// <summary>
    /// Minor units, as the gateway counts them: paise, not rupees.
    ///
    /// Stored the way it was sent so a reconciliation against the gateway's own
    /// records is a direct comparison and never a rounding argument.
    /// </summary>
    public long AmountMinor { get; set; }

    public string Currency { get; set; } = "INR";

    /// <summary>See <see cref="PaymentTransactionStatus"/>.</summary>
    public string Status { get; set; } = PaymentTransactionStatus.Created;

    /// <summary>
    /// The gateway event that moved this row to its current status.
    ///
    /// Kept because webhooks are redelivered: seeing the same event id twice is
    /// normal operation, not a duplicate payment, and this is what makes that
    /// decidable rather than guessed.
    /// </summary>
    public string? LastEventId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? CapturedAt { get; set; }

    public virtual Order Order { get; set; } = null!;
}
