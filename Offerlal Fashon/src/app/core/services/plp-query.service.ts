import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CatalogQuery } from '../models/catalog-search.model';

/** Facet selections travel as f.<code> so a new attribute needs no code change. */
const FACET_PREFIX = 'f.';

/** Params this service owns. Anything else in the URL is left untouched. */
const OWNED_KEYS = ['q', 'sort', 'page', 'priceMin', 'priceMax', 'inStock', 'customSizing', 'minRating'];

/**
 * The PLP's filter state, held in the URL rather than in component signals.
 *
 * The URL is the single source of truth on purpose. Previously filter state
 * lived only inside ProductBrowser, which meant a filtered view could not be
 * shared or bookmarked, the back button did not undo a filter (it left the
 * page entirely), and a reload dropped the shopper back to the unfiltered
 * grid. All three are standard behaviours on any large storefront.
 *
 * Reading the URL also makes filters crawlable and gives the browser's
 * forward/back stack for free instead of reimplementing an undo stack.
 */
@Injectable({ providedIn: 'root' })
export class PlpQueryService {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Current query, derived from the URL. Re-emits on every navigation. */
  readonly query = toSignal(this.route.queryParams.pipe(map((p) => parseQuery(p))), {
    initialValue: parseQuery({}),
  });

  /**
   * Merges a partial change into the URL.
   *
   * Any change other than paging resets to page 1 — staying on page 7 while
   * narrowing to three results shows an empty grid and reads as "no results"
   * rather than "you are past the end".
   */
  patch(change: Partial<CatalogQuery>, options: { resetPage?: boolean } = {}): void {
    const resetPage = options.resetPage ?? !('page' in change);
    const next = { ...this.query(), ...change };
    if (resetPage) next.page = 1;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toParams(next),
      // replaceUrl is NOT used: each filter change should be its own history
      // entry, which is what makes the back button undo one filter.
      queryParamsHandling: 'merge',
    });
  }

  /** Toggles one option within a facet. */
  toggleFacet(code: string, value: string): void {
    const facets = { ...(this.query().facets ?? {}) };
    const current = facets[code] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

    if (next.length === 0) delete facets[code];
    else facets[code] = next;

    this.patch({ facets });
  }

  /** Removes one applied filter — the X on a filter chip. */
  clearFacet(code: string, value?: string): void {
    const facets = { ...(this.query().facets ?? {}) };
    if (value === undefined) delete facets[code];
    else {
      const next = (facets[code] ?? []).filter((v) => v !== value);
      if (next.length === 0) delete facets[code];
      else facets[code] = next;
    }
    this.patch({ facets });
  }

  /**
   * Clears every filter this service owns while preserving the route context.
   * categoryId and occasionId come from the route path, not the query string,
   * so they deliberately survive "Clear all".
   */
  clearAll(): void {
    const cleared: Params = {};
    for (const key of OWNED_KEYS) cleared[key] = null;
    for (const code of Object.keys(this.query().facets ?? {})) {
      cleared[FACET_PREFIX + code] = null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: cleared,
      queryParamsHandling: 'merge',
    });
  }
}

/** Reads a CatalogQuery out of Angular's queryParams bag. */
export function parseQuery(params: Params): CatalogQuery {
  const facets: Record<string, string[]> = {};

  for (const [key, raw] of Object.entries(params)) {
    if (!key.startsWith(FACET_PREFIX)) continue;
    const code = key.slice(FACET_PREFIX.length);
    if (!code) continue;

    // Angular gives a string for one value and an array for repeated keys.
    const values = (Array.isArray(raw) ? raw : [raw])
      .flatMap((v: string) => String(v).split(','))
      .map((v) => v.trim())
      .filter(Boolean);

    if (values.length) facets[code] = [...new Set(values)];
  }

  return {
    q: params['q'] || undefined,
    sort: params['sort'] || 'recommended',
    page: toInt(params['page']) ?? 1,
    priceMin: toNum(params['priceMin']),
    priceMax: toNum(params['priceMax']),
    inStock: params['inStock'] === 'true' || undefined,
    customSizing: params['customSizing'] === 'true' || undefined,
    minRating: toNum(params['minRating']),
    facets,
  };
}

/** Writes a CatalogQuery back out, nulling anything at its default. */
export function toParams(query: CatalogQuery): Params {
  const params: Params = {
    // null removes the key under queryParamsHandling: 'merge'; undefined would
    // leave the previous value in place, which silently makes filters sticky.
    q: query.q || null,
    sort: query.sort && query.sort !== 'recommended' ? query.sort : null,
    page: query.page && query.page > 1 ? query.page : null,
    priceMin: query.priceMin ?? null,
    priceMax: query.priceMax ?? null,
    inStock: query.inStock ? 'true' : null,
    customSizing: query.customSizing ? 'true' : null,
    minRating: query.minRating ?? null,
  };

  for (const [code, values] of Object.entries(query.facets ?? {})) {
    params[FACET_PREFIX + code] = values.length ? values : null;
  }

  return params;
}

function toInt(value: unknown): number | undefined {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function toNum(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
