using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfferlalFashion.Api.Data;
using OfferlalFashion.Api.Models;

namespace OfferlalFashion.Api.Controllers;

/// <summary>
/// A customer's own orders.
///
/// Orders could be placed but never read back: the storefront's order history
/// and the app's Orders tab both ran on local data, so an order vanished from
/// the customer's view the moment they changed device.
///
/// Every query here is filtered by the customer id taken from the TOKEN, never
/// from the route or a query string. That is the whole security model of this
/// controller: an order number is short, sequential-ish and shared over
/// WhatsApp, so trusting one from the client would let anyone page through
/// other people's addresses and phone numbers.
/// </summary>
[ApiController]
[Route("api/orders")]
[Authorize(Roles = Roles.Customer)]
public class OrdersController(OfferlalFashionDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderSummaryDto>>> GetMine(CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var orders = await db.Orders.AsNoTracking()
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.PlacedAt)
            .Select(o => new OrderSummaryDto
            {
                OrderNumber = o.OrderNumber,
                Status = o.Status,
                PaymentStatus = o.PaymentStatus,
                Total = o.Total,
                PlacedAt = o.PlacedAt,
                ExpectedDeliveryDate = o.ExpectedDeliveryDate,
                TrackingNumber = o.TrackingNumber,
                ItemCount = o.OrderItems.Sum(i => i.Quantity),
                // One thumbnail so a list row can show what was ordered without
                // pulling every item of every order.
                ThumbnailUrl = o.OrderItems.Select(i => i.ImageUrl).FirstOrDefault(),
            })
            .ToListAsync(ct);

        return Ok(orders);
    }

    [HttpGet("{orderNumber}")]
    public async Task<ActionResult<OrderDetailDto>> GetOne(string orderNumber, CancellationToken ct = default)
    {
        var customerId = CustomerId();
        if (customerId is null) return Unauthorized();

        var order = await db.Orders.AsNoTracking()
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber && o.CustomerId == customerId, ct);

        // NotFound rather than Forbid when it belongs to someone else: telling
        // the caller an order exists but is not theirs confirms the number is
        // real, which is exactly what someone guessing wants to know.
        if (order is null) return NotFound();

        return Ok(new OrderDetailDto
        {
            OrderNumber = order.OrderNumber,
            Status = order.Status,
            PaymentStatus = order.PaymentStatus,
            PaymentMethod = order.PaymentMethod,
            Subtotal = order.Subtotal,
            Discount = order.Discount,
            CouponCode = order.CouponCode,
            ShippingFee = order.ShippingFee,
            Tax = order.Tax,
            Total = order.Total,
            PlacedAt = order.PlacedAt,
            ExpectedDeliveryDate = order.ExpectedDeliveryDate,
            TrackingNumber = order.TrackingNumber,
            ShipFullName = order.ShipFullName,
            ShipPhone = order.ShipPhone,
            ShipLine1 = order.ShipLine1,
            ShipLine2 = order.ShipLine2,
            ShipCity = order.ShipCity,
            ShipState = order.ShipState,
            ShipPincode = order.ShipPincode,
            Items = order.OrderItems
                .Select(i => new OrderItemDto
                {
                    ProductId = i.ProductId,
                    Name = i.Name,
                    ImageUrl = i.ImageUrl,
                    Sku = i.Sku,
                    Size = i.Size,
                    Color = i.Color,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    LineTotal = i.LineTotal,
                    Customizations = i.Customizations,
                })
                .ToList(),
        });
    }

    /// <summary>
    /// The customer id from the token.
    ///
    /// Also checks the subject TYPE: an admin token carries a subject id too,
    /// and without this check an admin id would be matched against CustomerId
    /// and quietly return an empty list rather than saying the caller is in the
    /// wrong place.
    /// </summary>
    private string? CustomerId()
    {
        var type = User.FindFirstValue("stype");
        if (!string.Equals(type, "customer", StringComparison.OrdinalIgnoreCase)) return null;

        var id = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return string.IsNullOrWhiteSpace(id) ? null : id;
    }
}

public sealed record OrderSummaryDto
{
    public string OrderNumber { get; init; } = "";
    public string Status { get; init; } = "";
    public string PaymentStatus { get; init; } = "";
    public decimal Total { get; init; }
    public DateTime PlacedAt { get; init; }
    public DateOnly ExpectedDeliveryDate { get; init; }
    public string? TrackingNumber { get; init; }
    public int ItemCount { get; init; }
    public string? ThumbnailUrl { get; init; }
}

public sealed record OrderDetailDto
{
    public string OrderNumber { get; init; } = "";
    public string Status { get; init; } = "";
    public string PaymentStatus { get; init; } = "";
    public string PaymentMethod { get; init; } = "";
    public decimal Subtotal { get; init; }
    public decimal Discount { get; init; }
    public string? CouponCode { get; init; }
    public decimal ShippingFee { get; init; }
    public decimal Tax { get; init; }
    public decimal Total { get; init; }
    public DateTime PlacedAt { get; init; }
    public DateOnly ExpectedDeliveryDate { get; init; }
    public string? TrackingNumber { get; init; }
    public string ShipFullName { get; init; } = "";
    public string ShipPhone { get; init; } = "";
    public string ShipLine1 { get; init; } = "";
    public string? ShipLine2 { get; init; }
    public string ShipCity { get; init; } = "";
    public string ShipState { get; init; } = "";
    public string ShipPincode { get; init; } = "";
    public IReadOnlyList<OrderItemDto> Items { get; init; } = [];
}

public sealed record OrderItemDto
{
    public string ProductId { get; init; } = "";
    public string Name { get; init; } = "";
    public string ImageUrl { get; init; } = "";
    public string Sku { get; init; } = "";
    public string Size { get; init; } = "";
    public string Color { get; init; } = "";
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal LineTotal { get; init; }
    public string? Customizations { get; init; }
}
