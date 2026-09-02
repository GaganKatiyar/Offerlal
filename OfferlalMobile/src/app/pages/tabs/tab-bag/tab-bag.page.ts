import { Component } from '@angular/core';
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

@Component({
  selector: 'app-tab-bag',
  templateUrl: 'tab-bag.page.html',
  styleUrls: ['tab-bag.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
})
export class TabBagPage {
  constructor(protected cart: CartService) {
    addIcons({ addOutline, removeOutline, trashOutline, bagHandleOutline });
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
