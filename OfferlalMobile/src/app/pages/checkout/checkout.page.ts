import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, radioButtonOff, addOutline } from 'ionicons/icons';
import { CartService } from '../../services/cart.service';
import { AddressService } from '../../services/address.service';
import { OrderService } from '../../services/order.service';
import { MobileAddress } from '../../data/mock-data';

const PAYMENT_METHODS = ['UPI', 'Card', 'NetBanking', 'COD'];

@Component({
  selector: 'app-checkout',
  templateUrl: 'checkout.page.html',
  styleUrls: ['checkout.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon],
})
export class CheckoutPage {
  protected paymentMethods = PAYMENT_METHODS;
  protected selectedAddressId = signal<string | null>(null);
  protected selectedPayment = signal<string>('UPI');
  protected placing = signal(false);

  protected shippingFee = 0;

  constructor(
    protected cart: CartService,
    protected addresses: AddressService,
    private orders: OrderService,
    private router: Router,
  ) {
    addIcons({ checkmarkCircle, radioButtonOff, addOutline });
    const defaultAddr = this.addresses.addresses().find((a) => a.isDefault) ?? this.addresses.addresses()[0];
    if (defaultAddr) this.selectedAddressId.set(defaultAddr.id);
    this.shippingFee = this.cart.subtotal() >= 2999 ? 0 : 150;
  }

  selectAddress(id: string): void {
    this.selectedAddressId.set(id);
  }

  selectPayment(method: string): void {
    this.selectedPayment.set(method);
  }

  placeOrder(): void {
    const address = this.addresses.addresses().find((a) => a.id === this.selectedAddressId());
    if (!address || this.cart.lines().length === 0) return;

    this.placing.set(true);
    setTimeout(() => {
      const order = this.orders.place(this.cart.lines(), address as MobileAddress, this.selectedPayment());
      this.cart.clear();
      this.router.navigate(['/order-confirmation', order.orderNumber]);
    }, 700);
  }
}
