import { ChangeDetectionStrategy, Component, effect, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { CheckoutApiService, PlacedOrder, toQuoteLines } from '../../core/services/checkout-api.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountApiService } from '../../core/services/account-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { RazorpayCheckoutService } from '../../core/services/razorpay-checkout.service';
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

/**
 * Where an online payment has got to, from this browser's point of view.
 *
 * 'confirming' is the important one and the reason this is not a boolean. The
 * customer has finished Razorpay's form, but an order becomes Paid only when a
 * signed webhook reaches our server, which happens out of band and takes a
 * moment. Showing success before that would be a guess; showing failure would
 * be wrong. So there is a state for "we are asking".
 */
type PaymentPhase =
  | 'idle'
  | 'starting'
  | 'confirming'
  | 'unconfirmed'
  | 'cancelled'
  | 'unavailable'
  | 'failed';

/** How long to keep asking the server whether the webhook has landed. */
const CONFIRM_POLL_INTERVAL_MS = 2000;
const CONFIRM_POLL_ATTEMPTS = 20;

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
  private paymentApi = inject(PaymentApiService);
  private razorpay = inject(RazorpayCheckoutService);
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

  /**
   * The order number, once it exists.
   *
   * An online payment places the order FIRST and then collects the money, so
   * between those two steps there is a real, unpaid order. Holding its number
   * here is what stops a customer who abandons the payment sheet and presses
   * the button again from filing a second order for the same bag: the retry
   * resumes this one.
   */
  protected placedOrderNumber = signal<string | null>(null);
  /** The server's own reply to place-order, carried to the confirmation page. */
  private placedOrder = signal<PlacedOrder | null>(null);
  protected paymentPhase = signal<PaymentPhase>('idle');
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

    // A second press after an abandoned payment resumes the order that was
    // already filed. Without this the customer gets two orders for one bag,
    // and only finds out when both arrive.
    const existingOrder = this.placedOrderNumber();
    if (existingOrder && this.paymentMethod() === 'Online') {
      void this.payOnline();
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
            this.rememberAddress();

            if (this.paymentMethod() === 'Online') {
              // The order now exists and is unpaid. The bag is deliberately
              // NOT cleared yet: if the payment is abandoned there is still a
              // visible summary of what was being bought, and the order number
              // above makes a retry resume this order rather than file another.
              this.placedOrderNumber.set(order.orderNumber);
              this.placedOrder.set(order);
              void this.payOnline();
              return;
            }

            this.placingOrder.set(false);
            this.cart.clear();
            // Both, and before navigating: goToConfirmation() reads the number
            // from here, so setting only the order object sent the customer
            // nowhere at all.
            this.placedOrderNumber.set(order.orderNumber);
            this.placedOrder.set(order);
            this.goToConfirmation();
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

  /**
   * Collects the money for an order that has already been placed.
   *
   * The sequence matters: order first, payment second. Taking the money before
   * the order exists means a captured payment with nothing to attach it to if
   * the next request fails, which is the one failure mode that costs a customer
   * real money with nothing to show for it.
   */
  private async payOnline(): Promise<void> {
    const orderNumber = this.placedOrderNumber();
    if (!orderNumber) return;

    this.formError.set('');
    this.placingOrder.set(true);
    this.paymentPhase.set('starting');

    let handoff;
    try {
      handoff = await firstValueFrom(this.paymentApi.createRazorpayOrder(orderNumber));
    } catch {
      this.placingOrder.set(false);
      this.paymentPhase.set('unavailable');
      return;
    }

    const outcome = await this.razorpay.open(handoff, {
      name: this.fullName(),
      email: this.email(),
      contact: this.mobile(),
    });

    if (outcome === 'unavailable') {
      this.placingOrder.set(false);
      this.paymentPhase.set('unavailable');
      return;
    }

    if (outcome === 'dismissed') {
      this.placingOrder.set(false);
      this.paymentPhase.set('cancelled');
      return;
    }

    // 'submitted' only means the form closed cleanly. Whether money moved is
    // something only the server knows, and only once Razorpay's signed webhook
    // has reached it.
    this.paymentPhase.set('confirming');
    const paid = await this.waitForConfirmation(orderNumber, handoff.razorpayOrderId);
    this.placingOrder.set(false);

    if (paid) {
      this.cart.clear();
      this.goToConfirmation('Paid');
      return;
    }

    // Not confirmed within the window. This is NOT a failure — a webhook can
    // be slow, and in local development it cannot arrive at all because
    // Razorpay's servers have no route to localhost. The order is real either
    // way, so the customer is sent to it rather than left on a dead spinner.
    this.cart.clear();
    this.paymentPhase.set('unconfirmed');
  }

  /**
   * Asks the server, repeatedly, whether the webhook has landed.
   *
   * Polling rather than trusting the browser's own success callback. That
   * callback runs in the customer's window and can be invoked by hand from the
   * console, so treating it as proof of payment would let anyone mark their own
   * order paid.
   */
  private async waitForConfirmation(orderNumber: string, razorpayOrderId: string): Promise<boolean> {
    for (let attempt = 0; attempt < CONFIRM_POLL_ATTEMPTS; attempt++) {
      try {
        const status = await firstValueFrom(this.paymentApi.status(orderNumber, razorpayOrderId));
        if (status.paymentStatus === 'Paid') return true;
        if (status.transactionStatus === 'Failed') return false;
      } catch {
        // A hiccup mid-poll is not an answer. Keep asking until the window
        // closes; the caller's 'unconfirmed' state covers running out of time.
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS));
    }
    return false;
  }

  /** Falls back to cash on delivery on an order that is already placed. */
  protected keepAsCod(): void {
    this.paymentPhase.set('idle');
    this.paymentMethod.set('COD');
    if (this.placedOrderNumber()) {
      this.cart.clear();
      this.goToConfirmation();
    }
  }

  /** Leaves checkout for an order whose payment we could not confirm in time. */
  protected viewPlacedOrder(): void {
    if (this.placedOrderNumber()) this.goToConfirmation();
  }

  /**
   * Hands the order to the confirmation page rather than making it look one up.
   *
   * A guest has no way to read their own order back - the orders endpoint is
   * scoped to a bearer token - so without this the page that thanks them for
   * paying could show them nothing at all.
   */
  private goToConfirmation(paymentStatus?: string): void {
    const orderNumber = this.placedOrderNumber();
    if (!orderNumber) return;
    const placed = this.placedOrder();
    this.router.navigate(['/checkout/confirmation', orderNumber], {
      state: {
        placedOrder: {
          orderNumber,
          total: placed?.total ?? this.grandTotal(),
          paymentStatus: paymentStatus ?? placed?.paymentStatus ?? 'Pending',
        },
      },
    });
  }
}
