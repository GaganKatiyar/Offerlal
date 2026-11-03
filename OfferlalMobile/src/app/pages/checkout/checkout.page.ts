import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, radioButtonOff, addOutline } from 'ionicons/icons';
import { CartService } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { OrderService } from '../../services/order.service';

/**
 * COD only, for now.
 *
 * UPI, Card and NetBanking were selectable and did nothing: the order was
 * written locally with no payment step at all. Until Razorpay is wired,
 * offering a payment method and taking no money is worse than not offering it,
 * because the customer believes they have paid.
 */
const PAYMENT_METHODS = ['COD'];

@Component({
  selector: 'app-checkout',
  templateUrl: 'checkout.page.html',
  styleUrls: ['checkout.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon],
})
export class CheckoutPage implements OnInit {
  protected cart = inject(CartService);
  protected addresses = inject(AddressService);
  private orders = inject(OrderService);
  private router = inject(Router);

  protected paymentMethods = PAYMENT_METHODS;
  protected selectedAddressId = signal<string | null>(null);
  protected selectedPayment = signal<string>('COD');
  protected placing = signal(false);
  protected error = signal<string | null>(null);
  /** Per-line reasons the server refused, e.g. something sold out. */
  protected problems = signal<string[]>([]);

  constructor() {
    addIcons({ checkmarkCircle, radioButtonOff, addOutline });
  }

  ngOnInit(): void {
    // Addresses come from the server, so preselecting has to wait for them.
    this.addresses.load().subscribe({
      next: (list) => {
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) this.selectedAddressId.set(preferred.id);
      },
      error: () => undefined,
    });

    // Re-quote on arrival rather than trusting whatever the bag screen last
    // saw: prices and stock move, and this is the number the customer is about
    // to agree to.
    this.refresh();
  }

  protected refresh(): void {
    if (!this.cart.lines().length) return;
    this.cart.refreshQuote().subscribe({ next: () => undefined, error: () => undefined });
  }

  selectAddress(id: string): void {
    this.selectedAddressId.set(id);
  }

  selectPayment(method: string): void {
    this.selectedPayment.set(method);
  }

  placeOrder(): void {
    const address = this.addresses.addresses().find((a) => a.id === this.selectedAddressId());
    if (!address || !this.cart.lines().length || this.placing()) return;

    this.placing.set(true);
    this.error.set(null);
    this.problems.set([]);

    this.orders
      .place(
        this.cart.lines(),
        {
          name: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        this.selectedPayment(),
      )
      .subscribe({
        next: (order) => {
          this.placing.set(false);
          this.cart.clear();
          this.router.navigate(['/order-confirmation', order.orderNumber]);
        },
        error: (err: unknown) => {
          this.placing.set(false);
          const e = err as HttpErrorResponse;
          const body = e?.error as { message?: string; problems?: string[] } | undefined;

          if (e?.status === 409) {
            // The request was well-formed; the world changed under it, usually
            // stock. Re-quote so the screen shows what is actually available.
            this.error.set(body?.message ?? 'This order could not be placed.');
            this.problems.set(body?.problems ?? []);
            this.refresh();
            return;
          }
          if (e?.status === 0) {
            this.error.set('Could not reach the server. Your bag is safe - please try again.');
            return;
          }
          this.error.set(body?.message ?? 'Could not place your order. Please try again.');
        },
      });
  }
}
