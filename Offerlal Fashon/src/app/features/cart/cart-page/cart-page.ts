import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CheckoutApiService, toQuoteLines } from '../../../core/services/checkout-api.service';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ImageWithFallback } from '../../../shared/components/image-with-fallback/image-with-fallback';
import { QuantityStepper } from '../../../shared/components/quantity-stepper/quantity-stepper';
import { StateBlock } from '../../../shared/ui/state';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, QuantityStepper, InrCurrencyPipe, StateBlock],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  protected cart = inject(CartService);
  protected wishlist = inject(WishlistService);
  private checkoutApi = inject(CheckoutApiService);
  private store = inject(DemoDataStoreService);
  private toast = inject(ToastService);

  protected couponCode = signal('');
  protected appliedCode = signal<string | null>(null);
  protected couponMessage = signal('');
  protected couponError = signal(false);

  /**
   * The server's price for the bag.
   *
   * The bag previously computed its own shipping threshold and total, using a
   * hardcoded 2,999 / 150 that also existed in checkout.html and pdp.html.
   * Three copies of a pricing rule means two of them are eventually wrong, and
   * the bag disagreeing with checkout is the version a customer notices.
   */
  private quoteResource = rxResource({
    params: () => ({ lines: toQuoteLines(this.cart.items()), coupon: this.appliedCode() }),
    stream: ({ params }) =>
      params.lines.length === 0 ? of(null) : this.checkoutApi.quote(params.lines, params.coupon, false),
  });

  /**
   * The server's price, or null when there isn't one.
   *
   * hasValue() guards the read because `resource.value()` THROWS once the
   * resource has errored. Reading it unguarded meant a failed quote raised
   * ResourceValueError during change detection and froze the bag mid-render —
   * the same crash the product listing had.
   */
  protected quote = computed(() =>
    this.quoteResource.hasValue() ? (this.quoteResource.value() ?? null) : null,
  );

  protected quoteLoading = computed(() => this.quoteResource.isLoading());

  /**
   * True when the server could not price this bag.
   *
   * This has to be explicit. Previously a failed quote was indistinguishable
   * from one in flight, and both fell back to a locally computed subtotal: the
   * bag quietly showed 1,650 for an order that costs 1,800, with shipping
   * displayed as Free, and let the customer carry on to checkout. A total the
   * client invents is exactly what server-authoritative pricing exists to
   * prevent.
   */
  protected quoteFailed = computed(() => !!this.quoteResource.error());

  protected discount = computed(() => this.quote()?.discount ?? 0);
  protected quoteProblems = computed(() => this.quote()?.problems ?? []);

  protected retryQuote(): void {
    this.quoteResource.reload();
  }

  protected productFor(productId: string) {
    return this.store.products().find((p) => p.id === productId);
  }

  /**
   * Shipping and total come from the server or are not shown at all.
   *
   * Both used to fall back — shipping to 0 and the total to the local subtotal
   * — with a comment claiming it only applied while the first quote was in
   * flight. It did not: rxResource reports no value on error just as it does
   * while loading, so a failed quote rendered as a complete, cheaper, wrong
   * price. Null means the template shows a placeholder instead of a number.
   */
  protected shippingFee = computed(() => this.quote()?.shippingFee ?? null);

  protected grandTotal = computed(() => this.quote()?.total ?? null);

  /** No server price, no checkout. */
  protected canCheckout = computed(() => this.grandTotal() !== null && !this.quoteFailed());

  protected applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) return;
    // Validated server-side; the client only shows the verdict.
    this.checkoutApi.quote(toQuoteLines(this.cart.items()), code, false).subscribe({
      next: (quote) => {
        this.couponMessage.set(quote.couponMessage ?? '');
        this.couponError.set(!quote.couponApplied);
        this.appliedCode.set(quote.couponApplied ? code.toUpperCase() : null);
      },
      error: () => {
        this.couponMessage.set('Could not check that coupon just now.');
        this.couponError.set(true);
      },
    });
  }

  protected removeCoupon(): void {
    this.appliedCode.set(null);
    this.couponMessage.set('');
    this.couponCode.set('');
  }

  protected moveToWishlist(itemId: string, productId: string): void {
    this.wishlist.toggle(productId);
    this.cart.remove(itemId);
    this.toast.show('Moved to wishlist');
  }

  protected estimatedDelivery(productId: string): number {
    return this.productFor(productId)?.deliveryEstimateDays.standard ?? 7;
  }
}
