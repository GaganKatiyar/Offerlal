import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartItem } from '../models';

/** A line as the server accepts it. Note what is absent: any price. */
export interface QuoteLineRequest {
  productId: string;
  variantId: string;
  size: string;
  quantity: number;
  customizationIds: string[];
}

export interface QuoteLine {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
  customizationTotal: number;
  lineTotal: number;
  availableStock: number;
  inStock: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  taxIncluded: number;
  couponCode?: string | null;
  couponMessage?: string | null;
  couponApplied: boolean;
  problems: string[];
  isFulfillable: boolean;
}

export interface PlaceOrderRequest {
  lines: QuoteLineRequest[];
  couponCode?: string | null;
  expressDelivery: boolean;
  customerId: string;
  /** Guest contact, used server-side to find or create the customer record. */
  email?: string;
  paymentMethod: string;
  shippingName: string;
  shippingPhone: string;
  shippingLine1: string;
  shippingLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
}

export interface PlacedOrder {
  orderNumber: string;
  total: number;
  paymentStatus: string;
}

/**
 * Talks to the server-authoritative checkout.
 *
 * The client no longer computes any money. It sends which products, which
 * sizes, how many and which customisations; the server looks up every price,
 * validates the coupon, applies shipping rules and returns the total. Before
 * this the browser computed the totals AND sent its own `discount`, which the
 * server stored verbatim.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  quote(lines: QuoteLineRequest[], couponCode: string | null, expressDelivery: boolean): Observable<Quote> {
    return this.http.post<Quote>(`${this.base}/checkout/quote`, { lines, couponCode, expressDelivery });
  }

  placeOrder(request: PlaceOrderRequest): Observable<PlacedOrder> {
    return this.http.post<PlacedOrder>(`${this.base}/checkout/place-order`, request);
  }
}

/**
 * Maps the local bag to what the server accepts.
 *
 * Deliberately drops unitPrice, lineTotal and every other money field the cart
 * happens to hold. Sending them would invite someone to start trusting them
 * again; the server ignores anything extra, but the safest request is one that
 * never carried the number in the first place.
 */
export function toQuoteLines(items: CartItem[]): QuoteLineRequest[] {
  return items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    size: item.size,
    quantity: item.quantity,
    customizationIds: item.customizations.map((c) => c.optionId),
  }));
}
