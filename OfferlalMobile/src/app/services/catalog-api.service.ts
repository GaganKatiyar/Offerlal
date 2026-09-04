import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { MobileCategory, MobileProduct } from '../data/mock-data';

/** What the API returns for a product card. */
interface ApiProductCard {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  subCategory: string;
  price: number;
  compareAtPrice?: number | null;
  rating: number;
  reviewCount: number;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  fabric?: string | null;
  thumbnailUrl: string;
  thumbnailAlt?: string | null;
  swatches?: { color: string; colorHex: string }[];
}

interface ApiPage<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string;
  parentId?: string | null;
  level: number;
}

export interface ProductQuery {
  categoryId?: string;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  isNewArrival?: boolean;
  onSale?: boolean;
}

export interface ProductPage {
  items: MobileProduct[];
  total: number;
  hasNext: boolean;
}

/**
 * The catalogue, from the API.
 *
 * Until now every screen imported PRODUCTS from mock-data.ts — eight hardcoded
 * items that could not go out of stock, change price or be merchandised. This
 * is the seam that replaces them.
 *
 * Responses are mapped to MobileProduct rather than the API's own shape. That
 * is deliberate for now: nineteen files already consume MobileProduct, and
 * changing where the data comes from is a big enough change on its own without
 * also changing what every page reads. The plan's shared TypeScript library
 * between web and mobile is still the right destination, and this mapper is
 * where it should be extracted from.
 *
 * The list endpoint carries less than the detail endpoint — no sizes, no work
 * details, no long description — so those fields come back empty here and the
 * product page fetches the full record. Filling them with plausible-looking
 * defaults would be worse: a size list that is empty is obviously incomplete,
 * one that is invented is not.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private categories$?: Observable<MobileCategory[]>;

  /** Categories, cached for the session — every tab asks for them. */
  categories(): Observable<MobileCategory[]> {
    this.categories$ ??= this.http.get<ApiCategory[]>(`${this.base}/categories`).pipe(
      map((rows) =>
        rows
          // Top-level only: the shop tab shows a single row of chips, and
          // including children would list "Clutch" beside "Bridal Lehengas".
          .filter((c) => c.level === 0)
          .map((c) => ({ id: c.id, slug: c.slug, name: c.name, imageUrl: c.thumbnailUrl })),
      ),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.categories$;
  }

  products(query: ProductQuery = {}): Observable<ProductPage> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 20));

    // These names must match ProductsController's [FromQuery] parameters
    // exactly. ASP.NET silently ignores an unknown query parameter rather than
    // rejecting it, so "search" instead of "q" does not error - it just returns
    // the entire unfiltered catalogue, which looks like a working search that
    // matches everything.
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.search) params = params.set('q', query.search);
    if (query.sort) params = params.set('sort', query.sort);
    if (query.isNewArrival) params = params.set('newArrivals', 'true');
    if (query.onSale) params = params.set('onSale', 'true');

    return this.http.get<ApiPage<ApiProductCard>>(`${this.base}/products`, { params }).pipe(
      map((page) => ({
        items: page.items.map(toMobileProduct),
        total: page.totalCount,
        hasNext: page.hasNext,
      })),
    );
  }

  /** The full record, for the product page. */
  productBySlug(slug: string): Observable<MobileProduct> {
    return this.http.get<Record<string, unknown>>(`${this.base}/products/by-slug/${slug}`).pipe(map(toDetail));
  }

  productById(id: string): Observable<MobileProduct> {
    return this.http.get<Record<string, unknown>>(`${this.base}/products/${id}`).pipe(map(toDetail));
  }

  /**
   * Resolves a set of ids, for the wishlist.
   *
   * One request per id: there is no batch endpoint, and adding one for a list
   * that is realistically a handful of items would be premature. forkJoin so
   * they go in parallel, and a single failure does not blank the whole page.
   */
  productsByIds(ids: string[]): Observable<MobileProduct[]> {
    if (!ids.length) return of([]);
    return forkJoin(
      ids.map((id) => this.productById(id).pipe(catchError(() => of(null)))),
    ).pipe(map((rows) => rows.filter((r): r is MobileProduct => r !== null)));
  }

  /** Drops the cached category list. */
  invalidate(): void {
    this.categories$ = undefined;
  }
}

function toMobileProduct(c: ApiProductCard): MobileProduct {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    categoryId: c.categoryId,
    categoryName: c.subCategory ?? '',
    price: c.price,
    compareAtPrice: c.compareAtPrice ?? undefined,
    rating: c.rating,
    reviewCount: c.reviewCount,
    imageUrl: c.thumbnailUrl,
    // The card carries one image. The second is only used as an alternate view,
    // so repeating the first is honest; the product page has the real gallery.
    imageUrl2: c.thumbnailUrl,
    isBestseller: c.isBestseller,
    isNewArrival: c.isNewArrival,
    colors: (c.swatches ?? []).map((s) => ({ name: s.color, hex: s.colorHex })),
    sizes: [],
    fabric: c.fabric ?? '',
    workDetails: '',
    description: '',
  };
}

/**
 * Maps the detail payload, whose images and sizes live on variants.
 *
 * Read defensively: this is the one response whose shape the mobile app does
 * not otherwise depend on, and a missing variant array here would otherwise
 * throw inside the product page rather than render a product without swatches.
 */
function toDetail(p: Record<string, unknown>): MobileProduct {
  const variants = (p['variants'] as VariantLike[] | undefined) ?? [];
  const images = variants.flatMap((v) => (v.images ?? []).map((i) => i.url)).filter(Boolean);
  // The detail payload carries a flat `sizes` array as well as per-SKU sizes.
  // Prefer it: it is the product's own size list, whereas deriving from SKUs
  // silently drops any size that happens to have no stock row yet.
  const sizes = Array.isArray(p['sizes']) && (p['sizes'] as string[]).length
    ? (p['sizes'] as string[])
    : [...new Set(variants.flatMap((v) => (v.skus ?? []).map((s) => s.size)))].filter(Boolean);

  const first = (p['thumbnailUrl'] as string) || images[0] || '';

  return {
    id: String(p['id'] ?? ''),
    slug: String(p['slug'] ?? ''),
    name: String(p['name'] ?? ''),
    categoryId: String(p['categoryId'] ?? ''),
    categoryName: String(p['subCategory'] ?? ''),
    price: Number(p['price'] ?? 0),
    compareAtPrice: p['compareAtPrice'] == null ? undefined : Number(p['compareAtPrice']),
    rating: Number(p['rating'] ?? 0),
    reviewCount: Number(p['reviewCount'] ?? 0),
    imageUrl: first,
    imageUrl2: images[1] ?? first,
    isBestseller: Boolean(p['isBestseller']),
    isNewArrival: Boolean(p['isNewArrival']),
    colors: variants
      .filter((v) => v.color)
      .map((v) => ({ name: v.color!, hex: v.colorHex ?? '#cccccc' })),
    sizes,
    fabric: String(p['fabric'] ?? ''),
    workDetails: String(p['workDetails'] ?? ''),
    description: String(p['description'] ?? p['shortDescription'] ?? ''),
  };
}

interface VariantLike {
  color?: string;
  colorHex?: string;
  images?: { url: string }[];
  skus?: { size: string }[];
}
