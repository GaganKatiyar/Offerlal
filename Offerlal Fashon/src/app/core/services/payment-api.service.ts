import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** What the server hands back to open a gateway checkout with. */
export interface RazorpayHandoff {
  /** Public key id. Safe in the browser; the key SECRET never leaves the server. */
  keyId: string;
  razorpayOrderId: string;
  /** Paise, as Razorpay counts. Computed server-side from our own order row. */
  amountMinor: number;
  currency: string;
  orderNumber: string;
}

export interface PaymentStatus {
  orderNumber: string;
  /** The order's own status. Only a signature-verified webhook sets this to Paid. */
  paymentStatus: string;
  /** The attempt's status: Created, Captured or Failed. */
  transactionStatus: string;
}

/**
 * The payment endpoints.
 *
 * Note what is not here: anything that marks an order paid. The browser can
 * start a payment and ask how one is going; it cannot report the outcome.
 * Confirmation arrives on the server from Razorpay's webhook, signed, and
 * that asymmetry is the whole security model — a success callback in this
 * window is forgeable by anyone with the developer tools open.
 */
@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /**
   * Creates (or recovers) the gateway order for an order already placed.
   *
   * Sends only the order number. The amount comes from the server's own row,
   * so a tampered client can at worst ask to pay for a different order of
   * ours, never for a different price.
   */
  createRazorpayOrder(orderNumber: string): Observable<RazorpayHandoff> {
    return this.http.post<RazorpayHandoff>(`${this.base}/payments/razorpay/create`, { orderNumber });
  }

  /** Both ids are required and must name the same attempt. See the server for why. */
  status(orderNumber: string, razorpayOrderId: string): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${this.base}/payments/razorpay/status`, {
      params: { orderNumber, razorpayOrderId },
    });
  }
}
