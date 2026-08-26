import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { CouponService } from '../../../core/services/coupon.service';
import { Order, Coupon } from '../../../core/models';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  protected auth = inject(AuthService);
  private orderService = inject(OrderService);
  private couponService = inject(CouponService);
  private router = inject(Router);

  protected recentOrders = signal<Order[]>([]);
  protected coupons = signal<Coupon[]>([]);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.orderService.getByCustomer(user.id).subscribe((orders) => this.recentOrders.set(orders.slice(0, 3)));
    this.couponService.getAll().subscribe((c) => this.coupons.set(c.filter((x) => x.isActive).slice(0, 4)));
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
