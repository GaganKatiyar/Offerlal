import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin-coupon-list',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, DatePipe],
  templateUrl: './coupon-list.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponList {
  protected store = inject(DemoDataStoreService);

  protected toggleActive(id: string, current: boolean): void {
    this.store.updateCoupon(id, { isActive: !current });
  }

  protected deleteCoupon(id: string, code: string): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete coupon ${code}?`)) return;
    this.store.deleteCoupon(id);
  }
}
