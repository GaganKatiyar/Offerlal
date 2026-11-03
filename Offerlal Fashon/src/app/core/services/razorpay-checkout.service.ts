import { Injectable } from '@angular/core';
import { RazorpayHandoff } from './payment-api.service';

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/** How the customer left the payment sheet. */
export type CheckoutOutcome =
  /** They completed the form. NOT a confirmation that money moved — poll the server. */
  | 'submitted'
  /** They closed it without paying. The order stays payable. */
  | 'dismissed'
  /** The sheet could not be opened at all, usually a blocked or failed script load. */
  | 'unavailable';

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (payload: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/**
 * Opens Razorpay's hosted checkout.
 *
 * The script is third-party and loaded from their CDN, which is how card data
 * stays out of this application entirely: the customer types their card into
 * Razorpay's iframe, not into our form, so those bytes never touch our origin.
 *
 * This service deliberately resolves with how the SHEET closed, never with
 * whether the payment succeeded. Razorpay's success handler runs in this
 * window, so anything it reports can be fabricated from the console. The
 * caller treats 'submitted' as "start asking the server", nothing more.
 */
@Injectable({ providedIn: 'root' })
export class RazorpayCheckoutService {
  /** Kept so a customer who retries doesn't re-download the script. */
  private loading?: Promise<boolean>;

  private load(): Promise<boolean> {
    if (window.Razorpay) return Promise.resolve(true);

    this.loading ??= new Promise<boolean>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
      const script = existing ?? document.createElement('script');

      script.addEventListener('load', () => resolve(!!window.Razorpay), { once: true });
      // Resolves false rather than rejecting. A blocked CDN is an ordinary
      // thing to be offline for — ad blockers and corporate proxies both do
      // it — and the caller already has an honest path for "we could not open
      // the payment window". An unhandled rejection would instead leave the
      // customer on a spinner.
      script.addEventListener('error', () => resolve(false), { once: true });

      if (!existing) {
        script.src = CHECKOUT_SCRIPT;
        script.async = true;
        document.head.appendChild(script);
      }
    });

    return this.loading;
  }

  /**
   * Opens the sheet and resolves once the customer is finished with it.
   *
   * @param prefill Contact details, so they are not retyped. Convenience only;
   *        the server already holds the authoritative copy on the order.
   */
  async open(
    handoff: RazorpayHandoff,
    prefill: { name: string; email: string; contact: string },
  ): Promise<CheckoutOutcome> {
    const ready = await this.load();
    if (!ready || !window.Razorpay) {
      // The script failed to load, or loaded without defining the global.
      this.loading = undefined;
      return 'unavailable';
    }

    return new Promise<CheckoutOutcome>((resolve) => {
      // Guards against resolving twice: Razorpay fires `ondismiss` after the
      // handler on some flows, and a settled promise would silently swallow
      // the second call while the first already moved the customer on.
      let settled = false;
      const settle = (outcome: CheckoutOutcome) => {
        if (settled) return;
        settled = true;
        resolve(outcome);
      };

      const rzp = new window.Razorpay!({
        key: handoff.keyId,
        amount: handoff.amountMinor,
        currency: handoff.currency,
        order_id: handoff.razorpayOrderId,
        name: 'Offerlal Fashion',
        description: `Order ${handoff.orderNumber}`,
        prefill: { name: prefill.name, email: prefill.email, contact: prefill.contact },
        theme: { color: '#9f1239' },
        // Razorpay calls this when the form is submitted successfully. We take
        // it only as a cue to go and ask the server; see the class comment.
        handler: () => settle('submitted'),
        modal: { ondismiss: () => settle('dismissed') },
      });

      // A declined card or an expired session. The order is untouched and
      // stays payable, so the customer can simply try again.
      rzp.on('payment.failed', () => settle('dismissed'));

      rzp.open();
    });
  }
}
