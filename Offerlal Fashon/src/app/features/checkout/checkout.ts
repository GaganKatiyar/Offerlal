import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { CouponService } from '../../core/services/coupon.service';
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
  private orderService = inject(OrderService);
  private couponService = inject(CouponService);
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
  protected discount = signal(0);
  protected couponMessage = signal('');

  protected placingOrder = signal(false);
  protected formError = signal('');

  protected shippingFee = computed(() => {
    const base = this.cart.subtotal() - this.discount();
    if (base >= 2999) return 0;
    return this.deliveryMethod() === 'express' ? 250 : 150;
  });

  protected grandTotal = computed(() => this.cart.subtotal() - this.discount() + this.shippingFee());

  protected productFor(productId: string) {
    return this.store.products().find((p) => p.id === productId);
  }

  protected applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) return;
    this.couponService.validate(code, this.cart.subtotal()).subscribe((result) => {
      this.couponMessage.set(result.message);
      if (result.valid) {
        this.discount.set(result.discountAmount);
        this.appliedCode.set(code.toUpperCase());
      }
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

    const proceed = (customerId: string) => {
      this.orderService
        .create({
          customerId,
          shippingAddress: address,
          billingAddress: address,
          paymentMethod: this.paymentMethod(),
          couponCode: this.appliedCode() ?? undefined,
          discount: this.discount(),
          expressDelivery: this.deliveryMethod() === 'express',
        })
        .subscribe((order) => {
          this.placingOrder.set(false);
          this.router.navigate(['/checkout/confirmation', order.orderNumber]);
        });
    };

    if (this.auth.currentUser()) {
      proceed(this.auth.currentUser()!.id);
    } else {
      const [firstName, ...rest] = this.fullName().trim().split(' ');
      this.auth
        .register({
          firstName: firstName || this.fullName(),
          lastName: rest.join(' ') || '-',
          email: this.email(),
          phone: this.mobile(),
          city: this.city(),
          state: this.state(),
        })
        .subscribe((customer) => proceed(customer.id));
    }
  }
}
