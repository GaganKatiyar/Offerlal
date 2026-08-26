import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Category, Occasion, BudgetTier } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private store = inject(DemoDataStoreService);

  getAll(): Observable<Category[]> {
    return of(this.store.categories()).pipe(delay(200));
  }

  getBySlug(slug: string): Observable<Category | undefined> {
    return of(this.store.categories().find((c) => c.slug === slug)).pipe(delay(200));
  }

  getOccasions(): Observable<Occasion[]> {
    return of(this.store.occasions()).pipe(delay(200));
  }

  getOccasionBySlug(slug: string): Observable<Occasion | undefined> {
    return of(this.store.occasions().find((o) => o.slug === slug)).pipe(delay(200));
  }

  getBudgetTiers(): Observable<BudgetTier[]> {
    return of(this.store.budgetTiers()).pipe(delay(200));
  }
}
