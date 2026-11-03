import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BudgetTier, Category, Occasion } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

/**
 * Categories and occasions, from the API.
 *
 * These used to come from the in-memory demo store, which is why editing a
 * category in admin changed the database and the shop page kept its old name:
 * the two were never reading the same thing. Renaming "Sarees" to "Sarees &
 * Drapes" updated the API and left the page heading untouched.
 *
 * Cached for the session with shareReplay, because the header, the homepage
 * rails and every PLP ask for the same two lists on each view. The admin
 * screens call invalidate() after a write, or an edit would not surface until
 * a full reload.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private store = inject(DemoDataStoreService);

  private categories$?: Observable<Category[]>;
  private occasions$?: Observable<Occasion[]>;

  getAll(): Observable<Category[]> {
    this.categories$ ??= this.http
      .get<Category[]>(`${this.base}/categories`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.categories$;
  }

  getBySlug(slug: string): Observable<Category | undefined> {
    // Served from the cached list rather than /by-slug: the caller is always a
    // page that has just rendered the full list anyway, and this avoids a
    // second round trip on every category navigation.
    return this.getAll().pipe(map((all) => all.find((c) => c.slug === slug)));
  }

  getOccasions(): Observable<Occasion[]> {
    this.occasions$ ??= this.http
      .get<Occasion[]>(`${this.base}/occasions`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.occasions$;
  }

  getOccasionBySlug(slug: string): Observable<Occasion | undefined> {
    return this.getOccasions().pipe(map((all) => all.find((o) => o.slug === slug)));
  }

  /**
   * Budget tiers are still demo data.
   *
   * There is no table and no endpoint behind them yet, so this is the one thing
   * on this service that a master screen cannot reach. Left explicit rather
   * than quietly returning an empty list.
   */
  getBudgetTiers(): Observable<BudgetTier[]> {
    return of(this.store.budgetTiers()).pipe(delay(200));
  }

  /** Drops the session cache, so the next read sees a just-saved edit. */
  invalidate(): void {
    this.categories$ = undefined;
    this.occasions$ = undefined;
  }
}
