import { Order, OrderItem, OrderStatus, OrderStatusEvent, PaymentMethod } from '../models';
import { CUSTOMERS } from './customers.data';
import { PRODUCTS } from './products.data';

function findProduct(id: string) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown product id in orders.data.ts: ${id}`);
  return p;
}

function item(productId: string, size: string, qty: number): OrderItem {
  const p = findProduct(productId);
  const variant = p.variants[0];
  const skuEntry = variant.skus.find((s) => s.size === size) ?? variant.skus[0];
  return {
    productId: p.id,
    name: p.name,
    imageUrl: variant.images[0].url,
    sku: skuEntry.sku,
    size,
    color: variant.color,
    quantity: qty,
    unitPrice: p.price,
    lineTotal: p.price * qty,
  };
}

const FORWARD_LADDER: OrderStatus[] = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered'];

function buildHistory(finalStatus: OrderStatus, placedAt: string): OrderStatusEvent[] {
  const start = new Date(placedAt);
  const history: OrderStatusEvent[] = [];
  const push = (status: OrderStatus, dayOffset: number, note?: string) => {
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    history.push({ status, timestamp: d.toISOString(), note });
  };

  if (finalStatus === 'Cancelled') {
    push('Placed', 0);
    push('Confirmed', 0);
    push('Cancelled', 1, 'Cancelled by customer before dispatch');
    return history;
  }
  if (finalStatus === 'Customized') {
    push('Placed', 0);
    push('Confirmed', 1);
    push('Processing', 2);
    push('Customized', 4, 'Custom measurements sent to the tailoring unit');
    return history;
  }
  if (['ReturnRequested', 'Returned', 'Exchanged', 'Refunded'].includes(finalStatus)) {
    FORWARD_LADDER.forEach((s, i) => push(s, i));
    push('ReturnRequested', 9, 'Return requested by customer');
    if (finalStatus !== 'ReturnRequested') {
      push(finalStatus, 13, finalStatus === 'Refunded' ? 'Refund processed to original payment method' : undefined);
    }
    return history;
  }
  const idx = FORWARD_LADDER.indexOf(finalStatus);
  FORWARD_LADDER.slice(0, idx + 1).forEach((s, i) => push(s, i));
  return history;
}

interface OrderSpec {
  num: number;
  customerId: string;
  items: { productId: string; size: string; qty: number }[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  placedAt: string;
  couponCode?: string;
  discount?: number;
}

function order(s: OrderSpec): Order {
  const customer = CUSTOMERS.find((c) => c.id === s.customerId)!;
  const items = s.items.map((i) => item(i.productId, i.size, i.qty));
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const discount = s.discount ?? 0;
  const shippingFee = subtotal - discount >= 2999 ? 0 : 150;
  const total = subtotal - discount + shippingFee;
  const address = customer.addresses[0];
  const placed = new Date(s.placedAt);
  const expected = new Date(placed);
  expected.setDate(expected.getDate() + 9);
  const trackedStatuses: OrderStatus[] = ['Shipped', 'OutForDelivery', 'Delivered', 'ReturnRequested', 'Returned', 'Exchanged', 'Refunded'];
  const isTracked = trackedStatuses.includes(s.status);

  return {
    id: `order-${String(s.num).padStart(3, '0')}`,
    orderNumber: `OF-2026-${100000 + s.num}`,
    customerId: s.customerId,
    items,
    subtotal,
    discount,
    couponCode: s.couponCode,
    shippingFee,
    tax: 0,
    total,
    status: s.status,
    statusHistory: buildHistory(s.status, s.placedAt),
    shippingAddress: address,
    billingAddress: address,
    paymentMethod: s.paymentMethod,
    paymentStatus: s.status === 'Refunded' ? 'Refunded' : s.paymentMethod === 'COD' && !isTracked ? 'Pending' : 'Paid',
    placedAt: s.placedAt,
    expectedDeliveryDate: expected.toISOString(),
    trackingNumber: isTracked ? `TRKOF${100000 + s.num}IN` : undefined,
    carrier: isTracked ? 'Delhivery' : undefined,
  };
}

const RAW: OrderSpec[] = [
  { num: 1, customerId: 'cust-001', items: [{ productId: 'prod-001', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-02-10T11:20:00Z', couponCode: 'WEDDING2026', discount: 8000 },
  { num: 2, customerId: 'cust-001', items: [{ productId: 'prod-056', size: 'Free Size', qty: 1 }, { productId: 'prod-058', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-03-15T09:10:00Z' },
  { num: 3, customerId: 'cust-002', items: [{ productId: 'prod-002', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'Card', placedAt: '2026-02-05T14:00:00Z', couponCode: 'WEDDING2026', discount: 8000 },
  { num: 4, customerId: 'cust-002', items: [{ productId: 'prod-050', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'Card', placedAt: '2026-03-01T10:30:00Z' },
  { num: 5, customerId: 'cust-002', items: [{ productId: 'prod-009', size: 'M', qty: 1 }, { productId: 'prod-053', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'NetBanking', placedAt: '2026-04-12T16:45:00Z' },
  { num: 6, customerId: 'cust-003', items: [{ productId: 'prod-023', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-03-02T12:00:00Z', couponCode: 'WELCOME10', discount: 2450 },
  { num: 7, customerId: 'cust-004', items: [{ productId: 'prod-017', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'COD', placedAt: '2026-01-25T09:00:00Z' },
  { num: 8, customerId: 'cust-005', items: [{ productId: 'prod-024', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-02-01T11:00:00Z' },
  { num: 9, customerId: 'cust-006', items: [{ productId: 'prod-015', size: 'S', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-05-15T10:00:00Z', couponCode: 'SANGEET15', discount: 2475 },
  { num: 10, customerId: 'cust-006', items: [{ productId: 'prod-057', size: '38', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-06-01T13:20:00Z' },
  { num: 11, customerId: 'cust-007', items: [{ productId: 'prod-017', size: 'L', qty: 1 }], status: 'Delivered', paymentMethod: 'COD', placedAt: '2026-02-12T09:40:00Z' },
  { num: 12, customerId: 'cust-008', items: [{ productId: 'prod-024', size: 'Free Size', qty: 1 }, { productId: 'prod-049', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'Card', placedAt: '2026-02-25T15:10:00Z' },
  { num: 13, customerId: 'cust-008', items: [{ productId: 'prod-034', size: 'M', qty: 1 }], status: 'Shipped', paymentMethod: 'Card', placedAt: '2026-08-08T10:00:00Z' },
  { num: 14, customerId: 'cust-009', items: [{ productId: 'prod-028', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'NetBanking', placedAt: '2026-03-10T09:00:00Z' },
  { num: 15, customerId: 'cust-009', items: [{ productId: 'prod-054', size: '2.6', qty: 1 }], status: 'Cancelled', paymentMethod: 'UPI', placedAt: '2026-08-05T09:00:00Z' },
  { num: 16, customerId: 'cust-010', items: [{ productId: 'prod-004', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-03-05T10:00:00Z', couponCode: 'BRIDAL5000', discount: 5000 },
  { num: 17, customerId: 'cust-010', items: [{ productId: 'prod-049', size: 'Free Size', qty: 1 }, { productId: 'prod-055', size: 'Free Size', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-04-01T09:00:00Z' },
  { num: 18, customerId: 'cust-011', items: [{ productId: 'prod-039', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'COD', placedAt: '2026-04-20T09:00:00Z' },
  { num: 19, customerId: 'cust-012', items: [{ productId: 'prod-031', size: 'S', qty: 1 }], status: 'Delivered', paymentMethod: 'Card', placedAt: '2026-05-08T10:00:00Z' },
  { num: 20, customerId: 'cust-012', items: [{ productId: 'prod-013', size: 'M', qty: 1 }], status: 'ReturnRequested', paymentMethod: 'Card', placedAt: '2026-07-10T10:00:00Z' },
  { num: 21, customerId: 'cust-013', items: [{ productId: 'prod-018', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-03-22T09:00:00Z' },
  { num: 22, customerId: 'cust-014', items: [{ productId: 'prod-022', size: 'S', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-04-15T09:00:00Z' },
  { num: 23, customerId: 'cust-014', items: [{ productId: 'prod-046', size: '6-7Y', qty: 1 }], status: 'Returned', paymentMethod: 'UPI', placedAt: '2026-06-18T09:00:00Z' },
  { num: 24, customerId: 'cust-015', items: [{ productId: 'prod-040', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'COD', placedAt: '2026-04-30T09:00:00Z' },
  { num: 25, customerId: 'cust-016', items: [{ productId: 'prod-005', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'Card', placedAt: '2026-05-02T09:00:00Z', couponCode: 'WEDDING2026', discount: 8000 },
  { num: 26, customerId: 'cust-016', items: [{ productId: 'prod-050', size: 'Free Size', qty: 1 }], status: 'Exchanged', paymentMethod: 'Card', placedAt: '2026-06-25T09:00:00Z' },
  { num: 27, customerId: 'cust-017', items: [{ productId: 'prod-016', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-05-20T09:00:00Z' },
  { num: 28, customerId: 'cust-018', items: [{ productId: 'prod-041', size: 'M', qty: 1 }], status: 'Delivered', paymentMethod: 'UPI', placedAt: '2026-05-25T09:00:00Z', couponCode: 'LOYALTY10', discount: 1350 },
  { num: 29, customerId: 'cust-019', items: [{ productId: 'prod-025', size: 'Free Size', qty: 1 }], status: 'Confirmed', paymentMethod: 'UPI', placedAt: '2026-08-14T08:30:00Z', couponCode: 'NEWUSER500', discount: 500 },
  { num: 30, customerId: 'cust-020', items: [{ productId: 'prod-027', size: 'Free Size', qty: 1 }], status: 'Confirmed', paymentMethod: 'COD', placedAt: '2026-08-13T08:00:00Z' },
  { num: 31, customerId: 'cust-003', items: [{ productId: 'prod-042', size: 'M', qty: 1 }], status: 'Placed', paymentMethod: 'UPI', placedAt: '2026-08-15T18:00:00Z', couponCode: 'RAKHI300', discount: 300 },
  { num: 32, customerId: 'cust-007', items: [{ productId: 'prod-059', size: 'Free Size', qty: 1 }], status: 'Placed', paymentMethod: 'UPI', placedAt: '2026-08-16T07:45:00Z' },
  { num: 33, customerId: 'cust-011', items: [{ productId: 'prod-060', size: '38', qty: 1 }], status: 'Packed', paymentMethod: 'UPI', placedAt: '2026-08-11T09:00:00Z' },
  { num: 34, customerId: 'cust-013', items: [{ productId: 'prod-038', size: 'M', qty: 1 }], status: 'Processing', paymentMethod: 'NetBanking', placedAt: '2026-08-12T09:00:00Z' },
  { num: 35, customerId: 'cust-005', items: [{ productId: 'prod-003', size: 'M', qty: 1 }], status: 'Customized', paymentMethod: 'UPI', placedAt: '2026-08-09T09:00:00Z', couponCode: 'WELCOME10', discount: 5000 },
  { num: 36, customerId: 'cust-004', items: [{ productId: 'prod-052', size: 'Free Size', qty: 1 }], status: 'OutForDelivery', paymentMethod: 'UPI', placedAt: '2026-08-05T09:00:00Z' },
  { num: 37, customerId: 'cust-017', items: [{ productId: 'prod-051', size: 'Free Size', qty: 1 }], status: 'OutForDelivery', paymentMethod: 'UPI', placedAt: '2026-08-06T09:00:00Z' },
];

export const ORDERS: Order[] = RAW.map(order);
