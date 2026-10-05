namespace OfferlalFashion.Api.Payments;

/// <summary>
/// Razorpay credentials, from appsettings.Development.Local.json (gitignored)
/// or the environment in production.
///
/// Three distinct secrets, and conflating them is the usual mistake:
/// <list type="bullet">
///   <item>KeyId is public — the browser needs it to open the checkout.</item>
///   <item>KeySecret authenticates OUR server-to-server calls. Never leaves here.</item>
///   <item>WebhookSecret verifies that an inbound webhook really came from
///   Razorpay. It is configured separately in their dashboard and is NOT the
///   key secret, however similar the two look in a config file.</item>
/// </list>
/// </summary>
public sealed class RazorpayOptions
{
    public string KeyId { get; init; } = "";
    public string KeySecret { get; init; } = "";
    public string WebhookSecret { get; init; } = "";

    /// <summary>
    /// Whether payments can be taken at all.
    ///
    /// Checked rather than assumed, so a missing key produces an honest
    /// "online payment is unavailable" instead of a 500 at the moment someone
    /// tries to pay.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(KeyId) && !string.IsNullOrWhiteSpace(KeySecret);

    /// <summary>
    /// Whether inbound webhooks can be trusted.
    ///
    /// Separate from IsConfigured on purpose: a deployment can be able to CREATE
    /// payments while unable to VERIFY their confirmations, and in that state
    /// the only safe thing is to reject every webhook rather than mark orders
    /// paid on an unverified say-so.
    /// </summary>
    public bool CanVerifyWebhooks => !string.IsNullOrWhiteSpace(WebhookSecret);

    /// <summary>Test keys are prefixed rzp_test_; live ones rzp_live_.</summary>
    public bool IsTestMode => KeyId.StartsWith("rzp_test_", StringComparison.Ordinal);
}
