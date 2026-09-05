import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { CheckoutApiService, toQuoteLines } from '../../core/services/checkout-api.service';
import { AuthService } from '../../core/services/auth.service';
import { DemoDataStoreService } from '../../core/services/demo-data-store.service';
import { Address, PaymentMethod } from '../../core/models';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, InrCurrencyPipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout {
  protected cart = inject(CartService);
  protected auth = inject(AuthService);
  private checkoutApi = inject(CheckoutApiService);
  private store = inject(DemoDataStoreService);
  private router = inject(Router);

  protected mobile = signal(this.auth.currentUser()?.phone ?? '');
  protected email = signal(this.auth.currentUser()?.email ?? '');

  protected fullName = signal(this.auth.currentUser() ? `${this.auth.currentUser()!.firstName} ${this.auth.currentUser()!.lastName}` : '');
  protected line1 = signal(this.auth.currentUser()?.addresses[0]?.line1 ?? '');
  protected landmark = signal('');
  protected city = signal(this.auth.currentUser()?.city ?? '');
  protected state = signal(this.auth.currentUser()?.state ?? '');
  protected pincode = signal('');

  protected deliveryMethod = signal<'standard' | 'express'>('standard');
  protected paymentMethod = signal<PaymentMethod>('UPI');

  protected couponCode = signal('');
  protected appliedCode = signal<string | null>(null);
  protected discount = computed(() => this.quote()?.discount ?? 0);
  protected couponMessage = signal('');

  protected placingOrder = signal(false);
  protected formError = signal('');

  /**
   * The server's price for the current bag.
   *
   * Every money figure on this page now comes from here. The previous version
   * computed the shipping threshold and grand total in the browser AND sent
   * its own `discount` to the order endpoint, which stored it verbatim — so a
   * customer could pay whatever they chose.
   *
   * Recomputed whenever the bag, the coupon or the delivery method changes, so
   * the number shown is the number that will be charged.
   */
  private quoteResource = rxResource({
    params: () => ({
      lines: toQuoteLines(this.cart.items()),
      coupon: this.appliedCode(),
      express: this.deliveryMethod() === 'express',
    }),
    stream: ({ params }) =>
      params.lines.length === 0
        ? of(null)
        : this.checkoutApi.quote(params.lines, params.coupon, params.express),
  });

  protected quote = computed(() => this.quoteResource.value() ?? null);
  protected quoteLoading = computed(() => this.quoteResource.isLoading());

  protected serverSubtotal = computed(() => this.quote()?.subtotal ?? this.cart.subtotal());
  protected shippingFee = computed(() => this.quote()?.shippingFee ?? 0);
  protected grandTotal = computed(() => this.quote()?.total ?? this.cart.subtotal());

  /** Stock or availability problems, surfaced before the customer pays. */
  protected quoteProblems = computed(() => this.quote()?.problems ?? []);

  protected productFor(productId: string) {
    return this.store.products().find((p) => p.id === productId);
  }

  /**
   * Applies a coupon by asking the server to re-quote with it.
   *
   * Validation lives entirely server-side now; the client only shows the
   * verdict. A coupon validated in the browser is a suggestion, not a rule.
   */
  protected applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) return;

    this.checkoutApi.quote(toQuoteLines(this.cart.items()), code, this.deliveryMethod() === 'express').subscribe({
      next: (quote) => {
        this.couponMessage.set(quote.couponMessage ?? '');
        // Only pin the code when the SERVER accepted it, so the quote resource
        // does not keep re-sending a code that will be refused.
        if (quote.couponApplied) this.appliedCode.set(code.toUpperCase());
      },
      error: () => this.couponMessage.set('Could not check that coupon just now.'),
    });
  }

  private buildAddress(): Address {
    return {
      id: `addr-checkout-${Date.now()}`,
      label: 'Home',
      fullName: this.fullName(),
      phone: this.mobile(),
      line1: this.line1(),
      line2: this.landmark(),
      city: this.city(),
      state: this.state(),
      pincode: this.pincode(),
      isDefault: true,
    };
  }

  protected placeOrder(): void {
    this.formError.set('');
    if (!this.mobile() || !this.email() || !this.fullName() || !this.line1() || !this.city() || !this.state() || !this.pincode()) {
      this.formError.set('Please fill in all required fields.');
      return;
    }
    if (this.cart.items().length === 0) {
      this.formError.set('Your bag is empty.');
      return;
    }

    this.placingOrder.set(true);
    const address = this.buildAddress();

    /**
     * Places the order.
     *
     * No customer id is sent. The server takes it from the bearer token when
     * there is one and ignores anything in the body, because trusting a
     * client-supplied id let anyone file an order against another person's
     * account. Signed in, the token identifies the customer; as a guest, the
     * server finds or creates one from the email below.
     */
    const proceed = () => {
      this.checkoutApi
        .placeOrder({
          lines: toQuoteLines(this.cart.items()),
          couponCode: this.appliedCode(),
          expressDelivery: this.deliveryMethod() === 'express',
          email: this.email(),
          paymentMethod: this.paymentMethod(),
          shippingName: this.fullName(),
          shippingPhone: this.mobile(),
          shippingLine1: this.line1(),
          shippingCity: this.city(),
          shippingState: this.state(),
          shippingPincode: this.pincode(),
        })
        .subscribe({
          next: (order) => {
            this.placingOrder.set(false);
            this.cart.clear();
            this.router.navigate(['/checkout/confirmation', order.orderNumber]);
          },
          error: (err: unknown) => {
            this.placingOrder.set(false);
            // 409 means the world changed under the customer - usually stock.
            // Showing the server's own reasons beats a generic failure.
            const problems = (err as { error?: { problems?: string[]; message?: string } })?.error;
            this.formError.set(
              problems?.problems?.join(' ') ??
                problems?.message ??
                'We could not place your order. Please try again.',
            );
          },
        });
    };

    // Guests are no longer silently registered here.
    //
    // That created an account with no password the customer never chose and
    // could not sign into afterwards, which was harmless only while any
    // password was accepted. Guest checkout is a first-class path on the
    // server: it resolves the customer from the email on the order.
    proceed();
  }
}
