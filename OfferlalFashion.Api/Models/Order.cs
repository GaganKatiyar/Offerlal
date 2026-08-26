using System;
using System.Collections.Generic;

namespace OfferlalFashion.Api.Models;

public partial class Order
{
    public string Id { get; set; } = null!;

    public string OrderNumber { get; set; } = null!;

    public string CustomerId { get; set; } = null!;

    public decimal Subtotal { get; set; }

    public decimal Discount { get; set; }

    public string? CouponCode { get; set; }

    public decimal ShippingFee { get; set; }

    public decimal Tax { get; set; }

    public decimal Total { get; set; }

    public string Status { get; set; } = null!;

    public string ShipFullName { get; set; } = null!;

    public string ShipPhone { get; set; } = null!;

    public string ShipLine1 { get; set; } = null!;

    public string? ShipLine2 { get; set; }

    public string ShipCity { get; set; } = null!;

    public string ShipState { get; set; } = null!;

    public string ShipPincode { get; set; } = null!;

    public string BillFullName { get; set; } = null!;

    public string BillPhone { get; set; } = null!;

    public string BillLine1 { get; set; } = null!;

    public string? BillLine2 { get; set; }

    public string BillCity { get; set; } = null!;

    public string BillState { get; set; } = null!;

    public string BillPincode { get; set; } = null!;

    public string PaymentMethod { get; set; } = null!;

    public string PaymentStatus { get; set; } = null!;

    public DateTime PlacedAt { get; set; }

    public DateOnly ExpectedDeliveryDate { get; set; }

    public string? TrackingNumber { get; set; }

    public string? Carrier { get; set; }

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<OrderStatusHistory> OrderStatusHistories { get; set; } = new List<OrderStatusHistory>();
}
