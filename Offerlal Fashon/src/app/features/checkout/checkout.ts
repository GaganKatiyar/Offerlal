import { ChangeDetectionStrategy, Component, effect, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { CheckoutApiService, toQuoteLines } from '../../core/services/checkout-api.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountApiService } from '../../core/services/account-api.service';
import { DemoDataStoreService } from '../../core/services/demo-data-store.service';
import { Address, PaymentMethod } from '../../core/models';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';
import { StateBlock } from '../../shared/ui/state';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

/** The three stages of checkout, in order. */
export type CheckoutStep = 'address' | 'review' | 'payment';
const STEPS: CheckoutStep[] = ['address', 'review', 'payment'];

/** An unknown or missing :step in the URL starts at the beginning. */
function normaliseStep(value: string | null): CheckoutStep {
  return STEPS.includes(value as CheckoutStep) ? (value as CheckoutStep) : 'address';
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, InrCurrencyPipe, StateBlock],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout {
  protected cart = inject(CartService);
  protected auth = inject(AuthService);
  private account = inject(AccountApiService);
  private checkoutApi = inject(CheckoutApiService);
  private store = inject(DemoDataStoreService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected mobile = signal(this.auth.currentUser()?.phone ?? '');
  protected email = signal(this.auth.currentUser()?.email ?? '');

  protected fullName = signal(this.auth.currentUser() ? `${this.auth.currentUser()!.firstName} ${this.auth.currentUser()!.lastName}` : '');
  protected line1 = signal(this.auth.currentUser()?.addresses[0]?.line1 ?? '');
  protected landmark = signal('');
  protected city = signal(this.auth.currentUser()?.city ?? '');
  protected state = signal(this.auth.currentUser()?.state ?? '');
  protected pincode = signal('');

  protected deliveryMethod = signal<'standard' | 'express'>('standard');
  protected paymentMethod = signal<PaymentMethod>('COD');

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

  /**
   * hasValue() guards the read: `resource.value()` THROWS once the resource has
   * errored, so reading it unguarded crashed change detection on the one screen
   * where the customer is about to commit money.
   */
  protected quote = computed(() =>
    this.quoteResource.hasValue() ? (this.quoteResource.value() ?? null) : null,
  );
  protected quoteLoading = computed(() => this.quoteResource.isLoading());
  protected quoteFailed = computed(() => !!this.quoteResource.error());

  protected retryQuote(): void {
    this.quoteResource.reload();
  }

  /**
   * Every figure here is the server's or is absent.
   *
   * These three used to fall back to the locally computed subtotal with
   * shipping at zero, so a failed quote rendered a complete and cheaper price
   * — and Place Order stayed enabled underneath it. The whole point of pricing
   * on the server is that the client never decides what something costs; a
   * fallback is that decision wearing a disguise.
   */
  protected serverSubtotal = computed(() => this.quote()?.subtotal ?? null);
  protected shippingFee = computed(() => this.quote()?.shippingFee ?? null);
  protected grandTotal = computed(() => this.quote()?.total ?? null);

  /**
   * An order may only be placed against a price the server has given us.
   *
   * Also blocked while a quote is in flight, so changing the delivery method
   * and pressing Place Order immediately cannot submit against the previous
   * total.
   */
  /**
   * Which step is on screen, taken from the URL.
   *
   * Checkout was one long form with four numbered headings. On a phone that is
   * a great deal of scrolling before anything confirms progress, and the back
   * button could only leave checkout entirely rather than step back within it.
   *
   * The URL is the source of truth rather than a signal the component owns, so
   * the browser's own back and forward work, and a step can be linked to.
   */
  protected step = toSignal(
    this.route.paramMap.pipe(map((p) => normaliseStep(p.get('step')))),
    { initialValue: 'address' as CheckoutStep },
  );

  protected stepIndex = computed(() => STEPS.indexOf(this.step()));

  /** Labels for the progress list. */
  protected steps: { id: CheckoutStep; label: string }[] = [
    { id: 'address', label: 'Address' },
    { id: 'review', label: 'Review' },
    { id: 'payment', label: 'Payment' },
  ];

  /**
   * Whether the address step has everything the courier needs.
   *
   * Also what gates the later steps: a pincode is what decides where a parcel
   * goes, so reaching payment without one is not a state worth supporting.
   */
  protected addressComplete = computed(
    () =>
      !!this.mobile().trim() &&
      !!this.email().trim() &&
      !!this.fullName().trim() &&
      !!this.line1().trim() &&
      !!this.city().trim() &&
      !!this.state().trim() &&
      !!this.pincode().trim(),
  );

  /**
   * Sends a deep link to a step that cannot be used back to the one that can.
   *
   * The form lives in memory, so opening /checkout/payment directly arrives
   * with every field empty: the customer would see a payment screen whose only
   * possible outcome is "please fill in all required fields". The order itself
   * was never at risk — placeOrder() validates independently — but showing a
   * dead end is its own problem.
   */
  private readonly guardStep = effect(() => {
    if (this.step() !== 'address' && !this.addressComplete()) {
      this.router.navigate(['/checkout', 'address'], { replaceUrl: true });
    }
  });

  protected goToStep(step: CheckoutStep): void {
    this.router.navigate(['/checkout', step]);
  }

  protected next(): void {
    if (this.step() === 'address') {
      if (!this.addressComplete()) {
        this.formError.set('Please fill in all required fields.');
        return;
      }
      this.formError.set('');
      // Prices can move while a form is being filled in, so the total shown on
      // the review step is fetched fresh rather than carried over.
      this.quoteResource.reload();
      this.goToStep('review');
      return;
    }
    if (this.step() === 'review') {
      this.goToStep('payment');
    }
  }

  protected back(): void {
    const i = this.stepIndex();
    if (i > 0) this.goToStep(STEPS[i - 1]);
  }

  protected canPlaceOrder = computed(
    () => this.grandTotal() !== null && !this.quoteFailed() && !this.quoteLoading(),
  );

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

  /**
   * Keeps the delivery address for next time.
   *
   * It was previously thrown away: a returning customer retyped their full
   * address on every order while an empty address book sat in their account.
   *
   * Signed-in only, because addresses are scoped to a customer by token and a
   * guest has no account to attach one to. Fire-and-forget on purpose — the
   * order is already placed, and failing to save a convenience must never
   * surface as an error on a successful purchase.
   */
  private rememberAddress(): void {
    if (!this.auth.isLoggedIn()) return;

    const existing = this.account.addresses();
    const pincode = this.pincode().trim();
    const line1 = this.line1().trim();

    // Do not accumulate a duplicate every time someone orders to the same place.
    const alreadySaved = existing.some(
      (a) => a.line1.trim().toLowerCase() === line1.toLowerCase() && a.pincode.trim() === pincode,
    );
    if (alreadySaved) return;

    this.account
      .addAddress({
        label: 'Home',
        fullName: this.fullName().trim(),
        phone: this.mobile().trim(),
        line1,
        line2: this.landmark().trim() || null,
        city: this.city().trim(),
        state: this.state().trim(),
        pincode,
        // The first address a customer saves becomes their default anyway;
        // this keeps a later one from silently displacing their chosen one.
        isDefault: existing.length === 0,
      })
      .subscribe({ next: () => undefined, error: () => undefined });
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
    // Guarded here as well as on the button: a disabled attribute is a hint to
    // the UI, not a rule, and this is the last point before money is committed.
    if (!this.canPlaceOrder()) {
      this.formError.set("We couldn't confirm your total. Please retry before placing the order.");
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
            this.rememberAddress();
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
