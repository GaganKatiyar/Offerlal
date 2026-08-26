import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

const TIMELINE_STEPS: OrderStatus[] = ['Placed', 'Confirmed', 'Processing', 'Customized', 'Packed', 'Shipped', 'OutForDelivery', 'Delivered'];

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [InrCurrencyPipe, DatePipe],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTracking implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  protected orderNumberInput = signal('');
  protected order = signal<Order | undefined>(undefined);
  protected searched = signal(false);
  protected timelineSteps = TIMELINE_STEPS;

  ngOnInit(): void {
    const fromRoute = this.route.snapshot.paramMap.get('orderNumber');
    if (fromRoute) {
      this.orderNumberInput.set(fromRoute);
      this.search();
    }
  }

  protected search(): void {
    const num = this.orderNumberInput().trim();
    if (!num) return;
    this.searched.set(true);
    this.orderService.getByOrderNumber(num).subscribe((o) => this.order.set(o));
  }

  protected stepIndex(o: Order): number {
    if (o.status === 'Cancelled' || o.status === 'ReturnRequested' || o.status === 'Returned' || o.status === 'Exchanged' || o.status === 'Refunded') {
      return this.timelineSteps.length - 1;
    }
    return this.timelineSteps.indexOf(o.status);
  }

  protected isSpecialStatus(o: Order): boolean {
    return ['Cancelled', 'ReturnRequested', 'Returned', 'Exchanged', 'Refunded'].includes(o.status);
  }
}
