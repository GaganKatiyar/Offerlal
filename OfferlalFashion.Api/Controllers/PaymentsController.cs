using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;
using OfferlalFashion.Api.Payments;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// Taking money.
///
/// One rule governs this whole file: an order becomes Paid only when a webhook
/// arrives whose HMAC signature verifies against our own webhook secret. Not
/// when the browser says the payment succeeded, not when Razorpay's checkout
/// closes with a success callback, not when the customer reaches the
/// confirmation page. All three are trivially forgeable by anyone with the
/// developer tools open; a signature is not.
/// </summary>
[ApiController]
[Route("api/payments")]
public class PaymentsController(
    OfferlalFashionDbContext db,
    RazorpayClient razorpay,
    ILogger<PaymentsController> log) : ControllerBase
{
    /// <summary>
    /// Creates a gateway order for an order we have already placed.
    ///
    /// Deliberately takes only an order number. The amount is read from our own
    /// row, so the browser cannot propose what it would like to pay — the same
    /// reason the quote endpoint exists.
    /// </summary>
    [HttpPost("razorpay/create")]
    public async Task<ActionResult<object>> CreateRazorpayOrder(
        [FromBody] CreatePaymentRequest request,
        CancellationToken ct = default)
    {
        if (!razorpay.IsConfigured)
        {
            // 503, not 500: nothing is broken, the capability is absent.
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Online payment is not available right now." });
        }

        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.OrderNumber == request.OrderNumber, ct);

        if (order is null) return NotFound(new { message = "Unknown order." });

        if (string.Equals(order.PaymentStatus, "Paid", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "That order has already been paid." });
        }

        // Reuse an outstanding attempt rather than creating a second gateway
        // order. A customer who closes the checkout sheet and taps Pay again
        // should land back in the same payment, not generate a parallel one
        // that could both be captured.
        var existing = await db.PaymentTransactions
            .Where(t => t.OrderId == order.Id && t.Status == PaymentTransactionStatus.Created)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

        if (existing is not null)
        {
            return Ok(new
            {
                keyId = razorpay.PublicKeyId,
                razorpayOrderId = existing.ProviderOrderId,
                amountMinor = existing.AmountMinor,
                currency = existing.Currency,
                orderNumber = order.OrderNumber,
            });
        }

        var created = await razorpay.CreateOrderAsync(
            order.Total, RazorpayClient.ReceiptFor(order.OrderNumber), ct);

        if (created is null)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { message = "We could not start the payment. Please try again." });
        }

        db.PaymentTransactions.Add(new PaymentTransaction
        {
            OrderId = order.Id,
            Provider = PaymentProvider.Razorpay,
            ProviderOrderId = created.Id,
            AmountMinor = created.AmountMinor,
            Currency = created.Currency,
            Status = PaymentTransactionStatus.Created,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            keyId = razorpay.PublicKeyId,
            razorpayOrderId = created.Id,
            amountMinor = created.AmountMinor,
            currency = created.Currency,
            orderNumber = order.OrderNumber,
        });
    }

    /// <summary>
    /// Where a payment attempt has got to, for the browser to poll after the
    /// checkout sheet closes.
    ///
    /// Takes the gateway order id as well as the order number, and requires
    /// both to name the same attempt. Order numbers are sequential and
    /// therefore guessable, so on the order number alone this would answer
    /// "has OF-2026-100041 been paid yet?" for anyone who asked. The gateway
    /// id is 20-odd random characters issued to the one browser that started
    /// the payment, which makes the pair unguessable.
    ///
    /// Returns our own stored status. It never asks Razorpay and never infers
    /// anything from the caller: this reports what a verified webhook has
    /// already established, which is the whole point of polling it.
    /// </summary>
    [HttpGet("razorpay/status")]
    public async Task<ActionResult<object>> PaymentStatus(
        [FromQuery] string orderNumber,
        [FromQuery] string razorpayOrderId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(orderNumber) || string.IsNullOrWhiteSpace(razorpayOrderId))
        {
            return BadRequest(new { message = "Both orderNumber and razorpayOrderId are required." });
        }

        var tx = await db.PaymentTransactions
            .Include(t => t.Order)
            .FirstOrDefaultAsync(
                t => t.ProviderOrderId == razorpayOrderId && t.Order.OrderNumber == orderNumber, ct);

        // One 404 for "no such order", "no such payment" and "those two do not
        // belong together". Distinguishing them would turn this into the
        // enumeration oracle the paired ids exist to prevent.
        if (tx is null) return NotFound();

        return Ok(new
        {
            orderNumber = tx.Order.OrderNumber,
            paymentStatus = tx.Order.PaymentStatus,
            transactionStatus = tx.Status,
        });
    }

    /// <summary>
    /// Razorpay's webhook. The only thing in this system that may mark an order paid.
    ///
    /// Reads the raw body rather than a bound model, because the signature is
    /// over the exact bytes sent: binding and re-serialising changes whitespace
    /// and key order, and the HMAC would never match again.
    /// </summary>
    [HttpPost("razorpay/webhook")]
    public async Task<IActionResult> RazorpayWebhook(CancellationToken ct = default)
    {
        if (!razorpay.CanVerifyWebhooks)
        {
            // Refuse rather than trust. A deployment that cannot verify
            // signatures must not mark anything paid on an unverified claim.
            log.LogError("Razorpay webhook received but no webhook secret is configured; rejecting.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;

        var signature = Request.Headers["X-Razorpay-Signature"].ToString();
        if (!razorpay.VerifyWebhookSignature(rawBody, signature))
        {
            // Warning, not Error: on a public endpoint this is as likely to be
            // someone probing as it is a misconfiguration.
            log.LogWarning("Rejected a Razorpay webhook with an invalid signature.");
            return Unauthorized();
        }

        RazorpayWebhookPayload payload;
        try
        {
            payload = ParsePayload(rawBody);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "A signature-verified Razorpay webhook could not be parsed.");
            // 400 so Razorpay stops retrying something we will never understand.
            return BadRequest();
        }

        if (string.IsNullOrWhiteSpace(payload.RazorpayOrderId))
        {
            // Events we do not act on (refunds, settlements) are acknowledged so
            // they are not retried forever.
            return Ok(new { ignored = payload.Event });
        }

        var tx = await db.PaymentTransactions
            .Include(t => t.Order)
            .FirstOrDefaultAsync(t => t.ProviderOrderId == payload.RazorpayOrderId, ct);

        if (tx is null)
        {
            // A verified webhook for an order we have no record of. Not an
            // error we can fix by retrying, so acknowledge and log it loudly.
            log.LogError(
                "Verified Razorpay webhook for unknown gateway order {GatewayOrderId}.",
                payload.RazorpayOrderId);
            return Ok(new { ignored = "unknown order" });
        }

        // Idempotency. Razorpay redelivers, and a second delivery of the same
        // event must be a no-op rather than a second capture.
        if (tx.Status == PaymentTransactionStatus.Captured)
        {
            return Ok(new { alreadyProcessed = true });
        }

        if (payload.IsCaptured)
        {
            // Guard the amount. A verified signature proves the message came
            // from Razorpay, not that it is for the sum we expected — a partial
            // capture must not mark a full order paid.
            if (payload.AmountMinor is long paid && paid < tx.AmountMinor)
            {
                log.LogError(
                    "Razorpay captured {Paid} against an expected {Expected} for order {OrderNumber}; not marking paid.",
                    paid, tx.AmountMinor, tx.Order.OrderNumber);
                return Ok(new { ignored = "amount mismatch" });
            }

            tx.Status = PaymentTransactionStatus.Captured;
            tx.ProviderPaymentId = payload.RazorpayPaymentId;
            tx.LastEventId = payload.EventId;
            tx.CapturedAt = DateTime.UtcNow;

            tx.Order.PaymentStatus = "Paid";
            await db.SaveChangesAsync(ct);

            log.LogInformation("Order {OrderNumber} marked paid from a verified webhook.", tx.Order.OrderNumber);
            return Ok(new { captured = true });
        }

        if (payload.IsFailed)
        {
            tx.Status = PaymentTransactionStatus.Failed;
            tx.ProviderPaymentId = payload.RazorpayPaymentId;
            tx.LastEventId = payload.EventId;
            await db.SaveChangesAsync(ct);
            // The ORDER is untouched: a failed attempt leaves it payable, so the
            // customer can simply try again.
            return Ok(new { failed = true });
        }

        return Ok(new { ignored = payload.Event });
    }

    private static RazorpayWebhookPayload ParsePayload(string rawBody)
    {
        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        var evt = root.TryGetProperty("event", out var e) ? e.GetString() ?? "" : "";

        string? orderId = null, paymentId = null;
        long? amount = null;

        if (root.TryGetProperty("payload", out var p) &&
            p.TryGetProperty("payment", out var pay) &&
            pay.TryGetProperty("entity", out var entity))
        {
            if (entity.TryGetProperty("order_id", out var o)) orderId = o.GetString();
            if (entity.TryGetProperty("id", out var i)) paymentId = i.GetString();
            if (entity.TryGetProperty("amount", out var a) && a.ValueKind == JsonValueKind.Number)
                amount = a.GetInt64();
        }

        return new RazorpayWebhookPayload
        {
            Event = evt,
            EventId = root.TryGetProperty("id", out var id) ? id.GetString() : null,
            RazorpayOrderId = orderId,
            RazorpayPaymentId = paymentId,
            AmountMinor = amount,
        };
    }

    private sealed record RazorpayWebhookPayload
    {
        public string Event { get; init; } = "";
        public string? EventId { get; init; }
        public string? RazorpayOrderId { get; init; }
        public string? RazorpayPaymentId { get; init; }
        public long? AmountMinor { get; init; }

        public bool IsCaptured => Event is "payment.captured" or "order.paid";
        public bool IsFailed => Event is "payment.failed";
    }
}

public sealed record CreatePaymentRequest
{
    public string OrderNumber { get; init; } = "";
}
