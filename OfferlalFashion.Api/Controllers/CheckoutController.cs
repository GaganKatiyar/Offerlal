using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using OfferlalFashion.Api.Auth;
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
        // The customer is decided HERE, from the token, and the body's value is
        // discarded either way.
        //
        // It used to be taken straight from the request, which was wrong twice
        // over. A signed-in app that did not happen to send its own id had its
        // order filed as a guest's and then could not see it in order history -
        // which is how this was noticed. The more serious half is that anyone
        // could send someone else's customer id and attach an order, with an
        // address of their choosing, to that person's account.
        //
        // Guest checkout still works: no token means no customer id, and the
        // order service finds or creates a customer from the contact details.
        request = request with { CustomerId = AuthenticatedCustomerId() ?? "" };

        var result = await orders.PlaceAsync(request, ct);

        if (!result.Success)
        {
            // 409, not 400: the request was well-formed, the world changed.
            return Conflict(new { message = "This order could not be placed.", problems = result.Problems });
        }

        return Ok(new { orderNumber = result.OrderNumber, total = result.Total, paymentStatus = "Pending" });
    }

    /// <summary>
    /// The caller's customer id, or null when this is a guest checkout.
    ///
    /// Checks the subject type as well: an admin token also carries a subject
    /// id, and using it here would file an order against a customer row that
    /// does not exist.
    /// </summary>
    private string? AuthenticatedCustomerId()
    {
        if (User?.Identity?.IsAuthenticated != true) return null;

        var type = User.FindFirstValue("stype");
        if (!string.Equals(type, TokenService.SubjectTypeCustomer, StringComparison.OrdinalIgnoreCase)) return null;

        var id = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return string.IsNullOrWhiteSpace(id) ? null : id;
    }
}
