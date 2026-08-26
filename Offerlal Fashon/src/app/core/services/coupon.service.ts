import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Coupon } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

export interface CouponValidationResult {
  valid: boolean;
  discountAmount: number;
  message: string;
  coupon?: Coupon;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private store = inject(DemoDataStoreService);

  getAll(): Observable<Coupon[]> {
    return of(this.store.coupons()).pipe(delay(200));
  }

  validate(code: string, subtotal: number, categoryIds: string[] = []): Observable<CouponValidationResult> {
    const coupon = this.store.coupons().find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    const now = new Date();

    const fail = (message: string) => of({ valid: false, discountAmount: 0, message }).pipe(delay(350));

    if (!coupon) return fail('Coupon code not found.');
    if (!coupon.isActive) return fail('This coupon is no longer active.');
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) return fail('This coupon has expired or is not yet active.');
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return fail('This coupon has reached its usage limit.');
    if (coupon.minOrderValue != null && subtotal < coupon.minOrderValue) {
      return fail(`Add items worth ₹${(coupon.minOrderValue - subtotal).toLocaleString('en-IN')} more to use this coupon.`);
    }
    if (coupon.applicableCategoryIds?.length && !categoryIds.some((id) => coupon.applicableCategoryIds!.includes(id))) {
      return fail('This coupon is not applicable to the items in your bag.');
    }

    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = Math.round((subtotal * coupon.value) / 100);
      if (coupon.maxDiscount != null) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else if (coupon.type === 'flat') {
      discountAmount = coupon.value;
    }

    return of({ valid: true, discountAmount, message: `${coupon.code} applied successfully!`, coupon }).pipe(delay(350));
  }
}
