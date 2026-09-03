import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { OrderService } from '../../services/order.service';
import { MobileOrder } from '../../data/mock-data';

const ALL_STATUSES = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered'];

@Component({
  selector: 'app-order-detail',
  templateUrl: 'order-detail.page.html',
  styleUrls: ['order-detail.page.scss'],
  standalone: true,
  imports: [DatePipe, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
})
export class OrderDetailPage {
  protected order = signal<MobileOrder | undefined>(undefined);
  protected allStatuses = ALL_STATUSES;

  constructor(route: ActivatedRoute, orders: OrderService) {
    const orderNumber = route.snapshot.paramMap.get('orderNumber');
    this.order.set(orderNumber ? orders.getByOrderNumber(orderNumber) : undefined);
  }

  /**
   * A step is "reached" if it's at or before the order's current position in
   * the canonical sequence — not merely if that exact status string appears
   * in statusHistory. Orders often skip logging every intermediate status
   * (e.g. going straight from Confirmed to Shipped), so checking literal
   * history presence left steps like "Packed" greyed out even on delivered
   * orders, with the connector line jumping past them in a contradictory way.
   */
  isStatusReached(status: string): boolean {
    const o = this.order();
    if (!o) return false;
    const currentIndex = this.allStatuses.indexOf(o.status);
    const stepIndex = this.allStatuses.indexOf(status);
    if (currentIndex === -1 || stepIndex === -1) {
      return o.statusHistory.some((h) => h.status === status);
    }
    return stepIndex <= currentIndex;
  }
}
