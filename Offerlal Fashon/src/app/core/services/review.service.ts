import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Review } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private store = inject(DemoDataStoreService);

  getByProduct(productId: string): Observable<Review[]> {
    return of(
      this.store
        .reviews()
        .filter((r) => r.productId === productId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    ).pipe(delay(200));
  }

  getFeatured(limit = 6): Observable<Review[]> {
    return of(
      [...this.store.reviews()].sort((a, b) => b.helpfulCount - a.helpfulCount).slice(0, limit),
    ).pipe(delay(200));
  }

  ratingBreakdown(productId: string): Observable<Record<1 | 2 | 3 | 4 | 5, number>> {
    const reviews = this.store.reviews().filter((r) => r.productId === productId);
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const bucket = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (breakdown[bucket] != null) breakdown[bucket]++;
    });
    return of(breakdown).pipe(delay(200));
  }
}
