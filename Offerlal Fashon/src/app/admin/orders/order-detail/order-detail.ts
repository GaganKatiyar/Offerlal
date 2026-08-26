import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { Order, OrderStatus } from '../../../core/models';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

const ALL_STATUSES: OrderStatus[] = ['Placed', 'Confirmed', 'Processing', 'Customized', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'ReturnRequested', 'Returned', 'Exchanged', 'Refunded'];

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, DatePipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderDetail implements OnInit {
  private store = inject(DemoDataStoreService);
  private route = inject(ActivatedRoute);

  protected orderId = signal('');
  protected allStatuses = ALL_STATUSES;
  protected newStatus = signal<OrderStatus>('Placed');

  protected order = computed<Order | undefined>(() => this.store.orders().find((o) => o.id === this.orderId()));

  protected customer = computed(() => this.store.customers().find((c) => c.id === this.order()?.customerId));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.orderId.set(id);
      const o = this.store.orders().find((x) => x.id === id);
      if (o) this.newStatus.set(o.status);
    }
  }

  protected updateStatus(): void {
    const o = this.order();
    if (!o) return;
    this.store.updateOrderStatus(o.id, this.newStatus(), 'Updated by admin');
  }

  protected cancelOrder(): void {
    const o = this.order();
    if (!o) return;
    if (typeof window !== 'undefined' && !window.confirm('Cancel this order?')) return;
    this.store.updateOrderStatus(o.id, 'Cancelled', 'Cancelled by admin');
    this.newStatus.set('Cancelled');
  }

  protected processReturn(): void {
    const o = this.order();
    if (!o) return;
    this.store.updateOrderStatus(o.id, 'Returned', 'Return processed by admin');
    this.newStatus.set('Returned');
  }

  protected processExchange(): void {
    const o = this.order();
    if (!o) return;
    this.store.updateOrderStatus(o.id, 'Exchanged', 'Exchange processed by admin');
    this.newStatus.set('Exchanged');
  }

  protected processRefund(): void {
    const o = this.order();
    if (!o) return;
    this.store.updateOrderStatus(o.id, 'Refunded', 'Refund processed by admin');
    this.newStatus.set('Refunded');
  }

  protected printInvoice(): void {
    if (typeof window !== 'undefined') window.print();
  }
}
