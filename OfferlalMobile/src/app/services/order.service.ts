import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CartLine } from './cart.service';

export interface OrderSummary {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  placedAt: string;
  expectedDeliveryDate: string;
  trackingNumber?: string | null;
  itemCount: number;
  thumbnailUrl?: string | null;
}

export interface OrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderDetail extends OrderSummary {
  paymentMethod: string;
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  shippingFee: number;
  tax: number;
  shipFullName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2?: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  /** The Ship* columns above, gathered for display. */
  shippingAddress: OrderAddress;
  items: {
    productId: string;
    name: string;
    imageUrl: string;
    sku: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    customizations?: string | null;
  }[];
}

export interface PlacedOrder {
  orderNumber: string;
  total: number;
  paymentStatus: string;
}

export interface ShippingDetails {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  email?: string | null;
}

/**
 * Orders, from the server.
 *
 * What this replaces was a working illustration of why the money path belongs
 * on the server. place() computed the subtotal from local prices, applied a
 * hardcoded "free over 2,999" rule that is now an editable store setting, and
 * numbered the order `orders().length + 1` — which collides the moment two
 * people check out at once. None of it ever reached a database, so an order
 * existed only on the phone that placed it.
 *
 * Now the app sends what the customer chose and the server decides the price,
 * the number and the stock.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** The signed-in customer's orders. Requires a token; the interceptor adds it. */
  list(): Observable<OrderSummary[]> {
    return this.http.get<OrderSummary[]>(`${this.base}/orders`);
  }

  get(orderNumber: string): Observable<OrderDetail> {
    return this.http
      .get<OrderDetail>(`${this.base}/orders/${orderNumber}`)
      .pipe(map((o) => ({ ...o, shippingAddress: toAddress(o) })));
  }

  /**
   * Places the order.
   *
   * Sends line identity and quantity only. No prices, no totals: the server
   * recomputes them, so nothing the app sends can change what is charged.
   */
  place(
    lines: CartLine[],
    shipping: ShippingDetails,
    paymentMethod: string,
    couponCode?: string | null,
    expressDelivery = false,
  ): Observable<PlacedOrder> {
    return this.http.post<PlacedOrder>(`${this.base}/checkout/place-order`, {
      lines: lines.map((l) => ({
        productId: l.product.id,
        variantId: l.variantId,
        size: l.size,
        quantity: l.quantity,
      })),
      couponCode: couponCode ?? null,
      expressDelivery,
      paymentMethod,
      email: shipping.email ?? null,
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingLine1: shipping.line1,
      shippingLine2: shipping.line2 ?? null,
      shippingCity: shipping.city,
      shippingState: shipping.state,
      shippingPincode: shipping.pincode,
    });
  }
}

function toAddress(o: OrderDetail): OrderAddress {
  return {
    fullName: o.shipFullName,
    phone: o.shipPhone,
    line1: o.shipLine1,
    line2: o.shipLine2,
    city: o.shipCity,
    state: o.shipState,
    pincode: o.shipPincode,
  };
}
