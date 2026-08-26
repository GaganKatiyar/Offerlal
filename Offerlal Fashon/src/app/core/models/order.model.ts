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

export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';
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
