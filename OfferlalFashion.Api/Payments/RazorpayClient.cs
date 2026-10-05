using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace OfferlalFashion.Api.Payments;

/// <summary>The gateway order we hand to the browser to open checkout with.</summary>
public sealed record RazorpayOrder(string Id, long AmountMinor, string Currency);

/// <summary>
/// Razorpay over plain HTTP.
///
/// No SDK. The two things we need are a POST to /v1/orders with basic auth and
/// an HMAC comparison for webhooks; a dependency for that is a dependency to
/// patch, audit and keep current for no gain.
/// </summary>
public sealed class RazorpayClient(
    HttpClient http,
    IOptions<RazorpayOptions> options,
    ILogger<RazorpayClient> log)
{
    private readonly RazorpayOptions opts = options.Value;

    public bool IsConfigured => opts.IsConfigured;
    public bool CanVerifyWebhooks => opts.CanVerifyWebhooks;
    public string PublicKeyId => opts.KeyId;

    /// <summary>
    /// Creates a gateway order for an amount WE computed.
    ///
    /// The caller passes the server's own total. Nothing about the amount comes
    /// from the browser, so a tampered client can at worst ask to pay for a
    /// different order of ours, never for a different price.
    /// </summary>
    public async Task<RazorpayOrder?> CreateOrderAsync(
        decimal amountRupees,
        string receipt,
        CancellationToken ct = default)
    {
        if (!opts.IsConfigured)
        {
            log.LogWarning("Razorpay is not configured; refusing to create a payment order.");
            return null;
        }

        // Razorpay counts in paise. Rounding here rather than letting a decimal
        // drift into the request: 1799.999 must become 180000 paise, not 179999.
        var amountMinor = (long)Math.Round(amountRupees * 100m, MidpointRounding.AwayFromZero);

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders")
        {
            Content = JsonContent(new
            {
                amount = amountMinor,
                currency = "INR",
                receipt,
                // We confirm from the webhook, so there is no benefit in
                // Razorpay auto-capturing silently behind our back; explicit
                // capture keeps one path to "paid".
                payment_capture = 1,
            }),
        };

        var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{opts.KeyId}:{opts.KeySecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);

        try
        {
            using var response = await http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                // Deliberately not logging the body verbatim at Information:
                // gateway errors can echo request fields back.
                log.LogError("Razorpay order creation failed with {Status}.", (int)response.StatusCode);
                return null;
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var id = root.GetProperty("id").GetString();
            if (string.IsNullOrWhiteSpace(id)) return null;

            return new RazorpayOrder(
                id,
                root.TryGetProperty("amount", out var a) ? a.GetInt64() : amountMinor,
                root.TryGetProperty("currency", out var c) ? c.GetString() ?? "INR" : "INR");
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Could not reach Razorpay to create a payment order.");
            return null;
        }
    }

    /// <summary>
    /// Verifies a webhook signature.
    ///
    /// The body must be the EXACT bytes Razorpay sent. Re-serialising a parsed
    /// model changes whitespace and key order and the HMAC stops matching — the
    /// classic way this check gets quietly disabled by someone "tidying up".
    ///
    /// Compared in fixed time, because a byte-by-byte early exit leaks how much
    /// of a guessed signature was right.
    /// </summary>
    public bool VerifyWebhookSignature(string rawBody, string? signatureHeader)
    {
        if (!opts.CanVerifyWebhooks || string.IsNullOrWhiteSpace(signatureHeader)) return false;

        var expected = Convert.ToHexString(
            HMACSHA256.HashData(
                Encoding.UTF8.GetBytes(opts.WebhookSecret),
                Encoding.UTF8.GetBytes(rawBody))).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signatureHeader.Trim().ToLowerInvariant()));
    }

    private static StringContent JsonContent(object value) =>
        new(JsonSerializer.Serialize(value), Encoding.UTF8, "application/json");

    /// <summary>Paise to rupees, for comparing a webhook amount against our order.</summary>
    public static decimal MinorToRupees(long minor) =>
        Math.Round(minor / 100m, 2, MidpointRounding.AwayFromZero);

    /// <summary>A stable, human-traceable receipt reference for the gateway.</summary>
    public static string ReceiptFor(string orderNumber) =>
        orderNumber.Length <= 40 ? orderNumber : orderNumber[..40];

    public static string FormatAmount(decimal rupees) =>
        rupees.ToString("0.00", CultureInfo.InvariantCulture);
}
