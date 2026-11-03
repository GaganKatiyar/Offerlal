import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogQuery, ProductSearchResult, SizeChart } from '../models/catalog-search.model';

/**
 * The storefront's catalogue HTTP client.
 *
 * This is the app's first real network call — everything before it ran on
 * in-memory demo data with a faked `of(...).pipe(delay(200))`.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  search(query: CatalogQuery): Observable<ProductSearchResult> {
    return this.http.get<ProductSearchResult>(`${this.base}/products`, {
      params: buildParams(query),
    });
  }

  /**
   * The size chart for a product, or null when its size scheme has none.
   *
   * The API answers 204 for jewellery and anything else without a chart, which
   * arrives here as an empty body. Null is the honest representation of "this
   * product has no size guide" — the caller then simply does not render one.
   */
  getSizeChart(productId: string): Observable<SizeChart | null> {
    return this.http
      .get<SizeChart>(`${this.base}/products/${encodeURIComponent(productId)}/size-chart`, {
        observe: 'response',
      })
      .pipe(map((res) => (res.status === 204 ? null : res.body)));
  }
}

/**
 * Serialises a query to the wire format.
 *
 * Facets go out as repeated `f.<code>` keys rather than one comma-joined
 * value, because a facet label can legitimately contain a comma and splitting
 * on it would corrupt the selection. The API accepts both shapes; this sends
 * the unambiguous one.
 *
 * Empty and default values are omitted entirely so the URL stays short and two
 * equivalent states produce one canonical URL — otherwise the same page is
 * reachable at several addresses, which is an SEO problem as much as a
 * caching one.
 */
export function buildParams(query: CatalogQuery): HttpParams {
  let params = new HttpParams();

  const setIf = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'boolean' && !value) return;
    params = params.set(key, String(value));
  };

  setIf('categoryId', query.categoryId);
  setIf('occasionId', query.occasionId);
  setIf('q', query.q);
  setIf('priceMin', query.priceMin);
  setIf('priceMax', query.priceMax);
  setIf('inStock', query.inStock);
  setIf('customSizing', query.customSizing);
  setIf('newArrivals', query.newArrivals);
  setIf('onSale', query.onSale);
  setIf('minRating', query.minRating);
  if (query.sort && query.sort !== 'recommended') params = params.set('sort', query.sort);
  if (query.page && query.page > 1) params = params.set('page', String(query.page));
  setIf('pageSize', query.pageSize);

  for (const [code, values] of Object.entries(query.facets ?? {})) {
    for (const value of values) {
      params = params.append(`f.${code}`, value);
    }
  }

  return params;
}
