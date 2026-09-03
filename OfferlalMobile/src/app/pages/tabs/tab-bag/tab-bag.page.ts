import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, trashOutline, bagHandleOutline } from 'ionicons/icons';
import { CartService, CartLine } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tab-bag',
  templateUrl: 'tab-bag.page.html',
  styleUrls: ['tab-bag.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
})
export class TabBagPage {
  constructor(
    protected cart: CartService,
    private auth: AuthService,
    private router: Router,
  ) {
    addIcons({ addOutline, removeOutline, trashOutline, bagHandleOutline });
  }

  goToCheckout(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/checkout']);
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
    }
  }

  inc(line: CartLine): void {
    this.cart.updateQuantity(line, line.quantity + 1);
  }

  dec(line: CartLine): void {
    this.cart.updateQuantity(line, line.quantity - 1);
  }

  remove(line: CartLine): void {
    this.cart.remove(line);
  }
}
