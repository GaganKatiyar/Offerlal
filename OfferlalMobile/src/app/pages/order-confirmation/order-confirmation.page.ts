import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle } from 'ionicons/icons';
import { OrderService } from '../../services/order.service';
import { MobileOrder } from '../../data/mock-data';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: 'order-confirmation.page.html',
  styleUrls: ['order-confirmation.page.scss'],
  standalone: true,
  imports: [RouterLink, DatePipe, IonContent, IonIcon],
})
export class OrderConfirmationPage {
  protected order = signal<MobileOrder | undefined>(undefined);

  constructor(route: ActivatedRoute, orders: OrderService) {
    addIcons({ checkmarkCircle });
    const orderNumber = route.snapshot.paramMap.get('orderNumber');
    this.order.set(orderNumber ? orders.getByOrderNumber(orderNumber) : undefined);
  }
}
