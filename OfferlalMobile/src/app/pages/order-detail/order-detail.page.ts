import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { OrderDetail, OrderService } from '../../services/order.service';

const ALL_STATUSES = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered'];

@Component({
  selector: 'app-order-detail',
  templateUrl: 'order-detail.page.html',
  styleUrls: ['order-detail.page.scss'],
  standalone: true,
  imports: [DatePipe, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
})
export class OrderDetailPage {
  private api = inject(OrderService);

  protected order = signal<OrderDetail | undefined>(undefined);
  protected allStatuses = ALL_STATUSES;
  protected loading = signal(true);
  protected failed = signal(false);

  constructor(route: ActivatedRoute) {
    const orderNumber = route.snapshot.paramMap.get('orderNumber');
    if (!orderNumber) {
      this.loading.set(false);
      return;
    }
    this.api.get(orderNumber).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /**
   * A step is "reached" if it is at or before the order's current position in
   * the canonical sequence. Orders skip intermediate statuses routinely (going
   * straight from Confirmed to Shipped), so position is the honest signal;
   * requiring each status to have been recorded left "Packed" greyed out on
   * delivered orders with the connector line jumping past it.
   *
   * The server keeps no status history, only the current status, so there is
   * nothing else this could be derived from.
   */
  isStatusReached(status: string): boolean {
    const o = this.order();
    if (!o) return false;
    const currentIndex = this.allStatuses.indexOf(o.status);
    const stepIndex = this.allStatuses.indexOf(status);
    if (currentIndex === -1 || stepIndex === -1) return false;
    return stepIndex <= currentIndex;
  }
}
