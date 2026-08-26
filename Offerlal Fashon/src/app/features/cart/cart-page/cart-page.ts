import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CouponService } from '../../../core/services/coupon.service';
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
  private coupon = inject(CouponService);
  private store = inject(DemoDataStoreService);
  private toast = inject(ToastService);

  protected couponCode = signal('');
  protected appliedCode = signal<string | null>(null);
  protected discount = signal(0);
  protected couponMessage = signal('');
  protected couponError = signal(false);

  protected productFor(productId: string) {
    return this.store.products().find((p) => p.id === productId);
  }

  protected shippingFee(): number {
    return this.cart.subtotal() - this.discount() >= 2999 ? 0 : 150;
  }

  protected grandTotal(): number {
    return this.cart.subtotal() - this.discount() + this.shippingFee();
  }

  protected applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) return;
    this.coupon.validate(code, this.cart.subtotal()).subscribe((result) => {
      this.couponMessage.set(result.message);
      this.couponError.set(!result.valid);
      if (result.valid) {
        this.discount.set(result.discountAmount);
        this.appliedCode.set(code.toUpperCase());
      } else {
        this.discount.set(0);
        this.appliedCode.set(null);
      }
    });
  }

  protected removeCoupon(): void {
    this.appliedCode.set(null);
    this.discount.set(0);
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
