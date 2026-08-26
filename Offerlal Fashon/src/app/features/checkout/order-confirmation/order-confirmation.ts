import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, DatePipe],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmation implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  protected order = signal<Order | undefined>(undefined);

  ngOnInit(): void {
    const orderNumber = this.route.snapshot.paramMap.get('orderNumber');
    if (orderNumber) {
      this.orderService.getByOrderNumber(orderNumber).subscribe((o) => this.order.set(o));
    }
  }
}
