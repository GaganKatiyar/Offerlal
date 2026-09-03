import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  templateUrl: 'orders.page.html',
  styleUrls: ['orders.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
})
export class OrdersPage {
  constructor(protected orderService: OrderService) {}

  statusClass(status: string): string {
    if (status === 'Delivered') return 'status-delivered';
    if (status === 'Cancelled' || status === 'Returned' || status === 'Refunded') return 'status-negative';
    return 'status-active';
  }
}
