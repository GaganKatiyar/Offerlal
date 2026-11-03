import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular';
import { OrderService, OrderSummary } from '../../services/order.service';

/**
 * Order history, from the server.
 *
 * It used to read a local array seeded from mock-data, so the list showed
 * fabricated orders to everyone and a real one only on the device that placed
 * it. The endpoint scopes to the signed-in customer.
 */
@Component({
  selector: 'app-orders',
  templateUrl: 'orders.page.html',
  styleUrls: ['orders.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class OrdersPage implements OnInit {
  private api = inject(OrderService);

  protected orders = signal<OrderSummary[]>([]);
  protected loading = signal(true);
  protected failed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected load(event?: { target: { complete: () => void } }): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.list().subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.loading.set(false);
        event?.target.complete();
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
        event?.target.complete();
      },
    });
  }

  statusClass(status: string): string {
    if (status === 'Delivered') return 'status-delivered';
    if (status === 'Cancelled' || status === 'Returned' || status === 'Refunded') return 'status-negative';
    return 'status-active';
  }
}
