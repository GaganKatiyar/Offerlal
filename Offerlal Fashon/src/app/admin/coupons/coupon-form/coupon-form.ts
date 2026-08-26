import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { Coupon, CouponType } from '../../../core/models';

@Component({
  selector: 'app-admin-coupon-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './coupon-form.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponForm implements OnInit {
  private store = inject(DemoDataStoreService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected isEdit = signal(false);
  protected couponId = signal<string | null>(null);

  protected code = signal('');
  protected description = signal('');
  protected type = signal<CouponType>('percent');
  protected value = signal(10);
  protected minOrderValue = signal<number | undefined>(undefined);
  protected maxDiscount = signal<number | undefined>(undefined);
  protected validFrom = signal(new Date().toISOString().slice(0, 10));
  protected validTo = signal(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  protected usageLimit = signal<number | undefined>(undefined);
  protected isActive = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const c = this.store.coupons().find((x) => x.id === id);
      if (c) {
        this.isEdit.set(true);
        this.couponId.set(id);
        this.code.set(c.code);
        this.description.set(c.description);
        this.type.set(c.type);
        this.value.set(c.value);
        this.minOrderValue.set(c.minOrderValue);
        this.maxDiscount.set(c.maxDiscount);
        this.validFrom.set(c.validFrom.slice(0, 10));
        this.validTo.set(c.validTo.slice(0, 10));
        this.usageLimit.set(c.usageLimit);
        this.isActive.set(c.isActive);
      }
    }
  }

  protected save(): void {
    if (!this.code() || !this.description()) {
      if (typeof window !== 'undefined') window.alert('Please fill in code and description.');
      return;
    }
    const coupon: Coupon = {
      id: this.couponId() ?? `cpn-${Date.now()}`,
      code: this.code().toUpperCase(),
      description: this.description(),
      type: this.type(),
      value: this.value(),
      minOrderValue: this.minOrderValue(),
      maxDiscount: this.maxDiscount(),
      validFrom: new Date(this.validFrom()).toISOString(),
      validTo: new Date(this.validTo()).toISOString(),
      usageLimit: this.usageLimit(),
      usedCount: this.isEdit() ? (this.store.coupons().find((c) => c.id === this.couponId())?.usedCount ?? 0) : 0,
      isActive: this.isActive(),
    };

    if (this.isEdit() && this.couponId()) {
      this.store.updateCoupon(this.couponId()!, coupon);
    } else {
      this.store.addCoupon(coupon);
    }
    this.router.navigate(['/admin/coupons']);
  }
}
