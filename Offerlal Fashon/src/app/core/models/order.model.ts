import { Address } from './address.model';

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Processing'
  | 'Customized'
  | 'Packed'
  | 'Shipped'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Cancelled'
  | 'ReturnRequested'
  | 'Returned'
  | 'Exchanged'
  | 'Refunded';

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customizations?: string[];
}

export interface OrderStatusEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

/**
 * How an order is being paid for.
 *
 * 'Online' covers every method the gateway offers — UPI, cards, net banking,
 * wallets — because which one the customer picked is chosen inside Razorpay's
 * sheet and reported by Razorpay, not by us. The older per-method values are
 * kept so historical orders still render.
 */
export type PaymentMethod = 'Online' | 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';
export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  placedAt: string;
  expectedDeliveryDate: string;
  trackingNumber?: string;
  carrier?: string;
}
