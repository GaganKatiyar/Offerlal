using Microsoft.AspNetCore.Mvc;
using OfferlalFashion.Api.Commerce;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// Quoting and order placement.
///
/// Both endpoints compute the price server-side from the catalogue. The client
/// sends what it wants, never what it costs.
/// </summary>
[ApiController]
[Route("api/checkout")]
public class CheckoutController(PricingService pricing, OrderService orders) : ControllerBase
{
    /// <summary>
    /// Prices a bag without placing an order — the cart and checkout summaries
    /// both read this, so what the customer sees is what the server will charge.
    /// </summary>
    [HttpPost("quote")]
    public async Task<ActionResult<Quote>> Quote([FromBody] QuoteRequest request, CancellationToken ct = default)
        => Ok(await pricing.QuoteAsync(request, ct));

    [HttpPost("place-order")]
    public async Task<ActionResult<object>> PlaceOrder([FromBody] PlaceOrderRequest request, CancellationToken ct = default)
    {
        var result = await orders.PlaceAsync(request, ct);

        if (!result.Success)
        {
            // 409, not 400: the request was well-formed, the world changed.
            return Conflict(new { message = "This order could not be placed.", problems = result.Problems });
        }

        return Ok(new { orderNumber = result.OrderNumber, total = result.Total, paymentStatus = "Pending" });
    }
}
