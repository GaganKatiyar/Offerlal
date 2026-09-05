import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccountOrderSummary {
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

export interface AccountOrderItem {
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
}

export interface AccountAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface AccountOrderDetail extends AccountOrderSummary {
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
  items: AccountOrderItem[];
  /** The Ship* fields above, gathered for display. */
  shippingAddress: Omit<AccountAddress, 'id' | 'label' | 'isDefault'>;
}

/**
 * The signed-in customer's orders and addresses, from the API.
 *
 * These were the last part of the storefront still reading DemoDataStoreService,
 * which resets on reload. That was survivable while nothing else was real, but
 * the app now reads the same customer's orders from the server — so the same
 * person saw one history on their phone and a different, invented one on the
 * website.
 *
 * No customer id is passed anywhere: the server scopes every response to the
 * bearer token. A client-supplied id is exactly the hole that had to be closed
 * in order placement.
 */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /** Cached so the account shell and the addresses page share one fetch. */
  readonly addresses = signal<AccountAddress[]>([]);

  orders(): Observable<AccountOrderSummary[]> {
    return this.http.get<AccountOrderSummary[]>(`${this.base}/orders`);
  }

  order(orderNumber: string): Observable<AccountOrderDetail> {
    return this.http.get<AccountOrderDetail>(`${this.base}/orders/${orderNumber}`).pipe(
      map((o) => ({
        ...o,
        shippingAddress: {
          fullName: o.shipFullName,
          phone: o.shipPhone,
          line1: o.shipLine1,
          line2: o.shipLine2,
          city: o.shipCity,
          state: o.shipState,
          pincode: o.shipPincode,
        },
      })),
    );
  }

  loadAddresses(): Observable<AccountAddress[]> {
    return this.http
      .get<AccountAddress[]>(`${this.base}/addresses`)
      .pipe(tap((rows) => this.addresses.set(rows)));
  }

  addAddress(body: Omit<AccountAddress, 'id'>): Observable<AccountAddress> {
    return this.http
      .post<AccountAddress>(`${this.base}/addresses`, body)
      .pipe(tap((created) => this.addresses.update((list) => [...list, created])));
  }

  updateAddress(id: string, body: Omit<AccountAddress, 'id'>): Observable<AccountAddress> {
    return this.http
      .put<AccountAddress>(`${this.base}/addresses/${id}`, body)
      .pipe(tap((saved) => this.addresses.update((l) => l.map((a) => (a.id === id ? saved : a)))));
  }

  deleteAddress(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/addresses/${id}`).pipe(
      // Reload rather than splice: deleting the default promotes another
      // server-side, and the list has to show which.
      tap(() => this.loadAddresses().subscribe({ next: () => undefined, error: () => undefined })),
    );
  }

  setDefaultAddress(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/addresses/${id}/default`, {})
      .pipe(tap(() => this.addresses.update((l) => l.map((a) => ({ ...a, isDefault: a.id === id })))));
  }

  /** Clears cached personal data on sign-out. */
  clear(): void {
    this.addresses.set([]);
  }
}
