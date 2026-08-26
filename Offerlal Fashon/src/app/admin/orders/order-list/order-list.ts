import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { OrderStatus } from '../../../core/models';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-admin-order-list',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, DatePipe],
  templateUrl: './order-list.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderList {
  private store = inject(DemoDataStoreService);
  protected query = signal('');
  protected statusFilter = signal<OrderStatus | 'all'>('all');

  protected statuses: OrderStatus[] = ['Placed', 'Confirmed', 'Processing', 'Customized', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'ReturnRequested', 'Returned', 'Exchanged', 'Refunded'];

  protected filtered = computed(() => {
    const q = this.query().toLowerCase();
    const status = this.statusFilter();
    return this.store
      .orders()
      .filter((o) => {
        if (status !== 'all' && o.status !== status) return false;
        if (q && !o.orderNumber.toLowerCase().includes(q) && !o.shippingAddress.fullName.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));
  });

  protected customerName(customerId: string): string {
    const c = this.store.customers().find((c) => c.id === customerId);
    return c ? `${c.firstName} ${c.lastName}` : 'Guest';
  }
}
