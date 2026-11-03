import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoryService } from './category.service';
import { NavApiService } from './nav-api.service';

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentId: string | null;
  displayOrder: number;
  level: number;
  path: string;
  isActive: boolean;
  heroImageUrl: string;
  heroImageAssetId: number | null;
  thumbnailUrl: string;
  thumbnailAssetId: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  productCount: number;
  childCount: number;
}

export interface CategoryWrite {
  name: string;
  slug?: string | null;
  description?: string | null;
  parentId?: string | null;
  heroImageUrl?: string | null;
  heroImageAssetId?: number | null;
  thumbnailUrl?: string | null;
  thumbnailAssetId?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  isActive: boolean;
}

export interface AdminOccasion {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAssetId: number | null;
  productCount: number;
}

export interface OccasionWrite {
  name: string;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageAssetId?: number | null;
}

/**
 * Categories and occasions — the catalogue's two taxonomies.
 *
 * One service for both because they are edited from one screen and share the
 * same cache problem: the header's menus resolve their labels and URLs from
 * these rows and are shareReplay-cached for the session, so any write here has
 * to invalidate that or the change appears only after a full reload.
 */
@Injectable({ providedIn: 'root' })
export class TaxonomyAdminService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private nav = inject(NavApiService);
  private catalogue = inject(CategoryService);

  // ------------------------------------------------------------- categories

  categories(): Observable<AdminCategory[]> {
    return this.http.get<AdminCategory[]>(`${this.base}/admin/categories`);
  }

  createCategory(body: CategoryWrite): Observable<AdminCategory> {
    return this.http.post<AdminCategory>(`${this.base}/admin/categories`, body).pipe(this.fresh());
  }

  updateCategory(id: string, body: CategoryWrite): Observable<AdminCategory> {
    return this.http.put<AdminCategory>(`${this.base}/admin/categories/${id}`, body).pipe(this.fresh());
  }

  /**
   * Sends the whole tree's parentage and order in one request.
   *
   * The server rebuilds materialised paths from this, so a partial payload
   * would describe a tree that does not exist.
   */
  reorderCategories(
    items: { id: string; parentId: string | null; displayOrder: number }[],
  ): Observable<{ moved: number; pathsRewritten: number }> {
    return this.http
      .put<{ moved: number; pathsRewritten: number }>(`${this.base}/admin/categories/reorder`, { items })
      .pipe(this.fresh());
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/categories/${id}`).pipe(this.fresh());
  }

  // -------------------------------------------------------------- occasions

  occasions(): Observable<AdminOccasion[]> {
    return this.http.get<AdminOccasion[]>(`${this.base}/admin/occasions`);
  }

  createOccasion(body: OccasionWrite): Observable<AdminOccasion> {
    return this.http.post<AdminOccasion>(`${this.base}/admin/occasions`, body).pipe(this.fresh());
  }

  updateOccasion(id: string, body: OccasionWrite): Observable<AdminOccasion> {
    return this.http.put<AdminOccasion>(`${this.base}/admin/occasions/${id}`, body).pipe(this.fresh());
  }

  deleteOccasion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/occasions/${id}`).pipe(this.fresh());
  }

  /**
   * Drops both session caches after a write.
   *
   * Two, not one: the menus cache their labels and URLs, and the storefront
   * caches the category and occasion lists that every shop page reads its
   * heading from. Missing either means the edit only appears after a reload.
   */
  private fresh<T>() {
    return tap<T>(() => {
      this.nav.invalidate();
      this.catalogue.invalidate();
    });
  }
}
