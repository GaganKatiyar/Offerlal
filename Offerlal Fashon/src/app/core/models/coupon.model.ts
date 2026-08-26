export type CouponType = 'percent' | 'flat' | 'free-shipping';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  usedCount: number;
  applicableCategoryIds?: string[];
  isActive: boolean;
}
