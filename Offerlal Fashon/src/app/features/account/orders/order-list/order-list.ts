import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { OrderService } from '../../../../core/services/order.service';
import { Order } from '../../../../core/models';
import { InrCurrencyPipe } from '../../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe],
  templateUrl: './order-list.html',
  styleUrl: '../../dashboard/dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderList implements OnInit {
  protected auth = inject(AuthService);
  private orderService = inject(OrderService);
  protected orders = signal<Order[]>([]);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.orderService.getByCustomer(user.id).subscribe((o) => this.orders.set(o));
  }
}
