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
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, QuantityStepper, InrCurrencyPipe],
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

  protected quote = computed(() => this.quoteResource.value() ?? null);
  protected discount = computed(() => this.quote()?.discount ?? 0);
  protected quoteProblems = computed(() => this.quote()?.problems ?? []);

  protected productFor(productId: string) {
    return this.store.products().find((p) => p.id === productId);
  }

  /** Falls back to the local subtotal only while the first quote is in flight. */
  protected shippingFee = computed(() => this.quote()?.shippingFee ?? 0);

  protected grandTotal = computed(() => this.quote()?.total ?? this.cart.subtotal());

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
