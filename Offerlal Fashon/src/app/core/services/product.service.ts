import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Product, ProductFilters, ProductSortOption } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

const LATENCY = 250;

function sortProducts(products: Product[], sort: ProductSortOption | undefined): Product[] {
  const list = [...products];
  switch (sort) {
    case 'newest':
      return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case 'bestselling':
      return list.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || b.reviewCount - a.reviewCount);
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    default:
      return list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.rating - a.rating);
  }
}

function applyFilters(products: Product[], filters?: ProductFilters): Product[] {
  if (!filters) return products;
  return products.filter((p) => {
    if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
    if (filters.occasion && !p.occasion.includes(filters.occasion)) return false;
    if (filters.priceMin != null && p.price < filters.priceMin) return false;
    if (filters.priceMax != null && p.price > filters.priceMax) return false;
    if (filters.colors?.length && !p.variants.some((v) => filters.colors!.includes(v.color))) return false;
    if (filters.sizes?.length && !p.sizes.some((s) => filters.sizes!.includes(s))) return false;
    if (filters.fabrics?.length && !filters.fabrics.some((f) => p.fabric.toLowerCase().includes(f.toLowerCase()))) return false;
    if (filters.work?.length && !filters.work.some((w) => p.workDetails.toLowerCase().includes(w.toLowerCase()))) return false;
    if (filters.inStockOnly && p.stockStatus === 'out-of-stock') return false;
    if (filters.minRating != null && p.rating < filters.minRating) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const haystack = `${p.name} ${p.description} ${p.tags.join(' ')} ${p.fabric} ${p.workDetails}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private store = inject(DemoDataStoreService);

  getAll(filters?: ProductFilters, sort?: ProductSortOption): Observable<Product[]> {
    return of(this.store.products()).pipe(
      map((list) => sortProducts(applyFilters(list, filters), sort)),
      delay(LATENCY),
    );
  }

  getBySlug(slug: string): Observable<Product | undefined> {
    return of(this.store.products().find((p) => p.slug === slug)).pipe(delay(LATENCY));
  }

  getById(id: string): Observable<Product | undefined> {
    return of(this.store.products().find((p) => p.id === id)).pipe(delay(LATENCY));
  }

  getByCategory(categoryId: string, filters?: ProductFilters, sort?: ProductSortOption): Observable<Product[]> {
    return this.getAll({ ...filters, categoryId }, sort);
  }

  getByOccasion(occasion: string, filters?: ProductFilters, sort?: ProductSortOption): Observable<Product[]> {
    return this.getAll({ ...filters, occasion }, sort);
  }

  getBestsellers(limit = 8): Observable<Product[]> {
    return of(this.store.products().filter((p) => p.isBestseller).slice(0, limit)).pipe(delay(LATENCY));
  }

  getNewArrivals(limit = 8): Observable<Product[]> {
    return of(sortProducts(this.store.products().filter((p) => p.isNewArrival), 'newest').slice(0, limit)).pipe(delay(LATENCY));
  }

  getFeatured(limit = 6): Observable<Product[]> {
    return of(this.store.products().filter((p) => p.isFeatured).slice(0, limit)).pipe(delay(LATENCY));
  }

  getBridalEdit(limit = 8): Observable<Product[]> {
    return of(this.store.products().filter((p) => p.isBridal).slice(0, limit)).pipe(delay(LATENCY));
  }

  getRelated(productId: string, limit = 4): Observable<Product[]> {
    const product = this.store.products().find((p) => p.id === productId);
    if (!product) return of([]).pipe(delay(LATENCY));
    return of(
      this.store
        .products()
        .filter((p) => p.id !== productId && p.categoryId === product.categoryId)
        .slice(0, limit),
    ).pipe(delay(LATENCY));
  }

  search(query: string, limit = 12): Observable<Product[]> {
    if (!query.trim()) return of([]).pipe(delay(150));
    return of(applyFilters(this.store.products(), { query }).slice(0, limit)).pipe(delay(200));
  }
}
