import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** One navigation entry, with children nested for mega-menu columns. */
export interface NavItem {
  id: number;
  label: string;
  url: string;
  iconName?: string | null;
  imageUrl?: string | null;
  columnIndex: number;
  isHighlighted: boolean;
  badgeText?: string | null;
  children: NavItem[];
}

@Injectable({ providedIn: 'root' })
export class NavApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /**
   * Menus are cached for the session.
   *
   * The header renders on every route, so without shareReplay a menu fetch
   * would fire on each navigation. Navigation changes rarely enough that a
   * page reload is an acceptable way to see an edit.
   */
  private cache = new Map<string, Observable<NavItem[]>>();

  /**
   * Clears the session cache after an admin edit.
   *
   * Menus are shareReplay-cached because the header renders on every route.
   * Without this an admin would save a change and see nothing until a full
   * reload, and reasonably conclude the save had failed.
   */
  invalidate(): void {
    this.cache.clear();
    this.settings = undefined;
  }

  getMenu(code: string): Observable<NavItem[]> {
    let menu = this.cache.get(code);
    if (!menu) {
      menu = this.http
        .get<NavItem[]>(`${this.base}/nav/${encodeURIComponent(code)}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(code, menu);
    }
    return menu;
  }

  /** Store settings as a flat map, cached for the session. */
  private settings?: Observable<Record<string, string | null>>;

  getSettings(): Observable<Record<string, string | null>> {
    this.settings ??= this.http
      .get<Record<string, string | null>>(`${this.base}/settings`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.settings;
  }
}

// ---------------------------------------------------------------------------
// Admin navigation client.
// ---------------------------------------------------------------------------

export interface AdminNavItem {
  id: number;
  parentId: number | null;
  label: string;
  url?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  occasionId?: string | null;
  occasionName?: string | null;
  iconName?: string | null;
  columnIndex: number;
  displayOrder: number;
  isActive: boolean;
  isHighlighted: boolean;
  badgeText?: string | null;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  resolvedUrl: string;
  children: AdminNavItem[];
}

export interface AdminNavMenu {
  id: number;
  code: string;
  name: string;
  items: AdminNavItem[];
}

export interface NavItemWrite {
  parentId?: number | null;
  label: string;
  /** category | occasion | url — decides which target the server keeps. */
  linkType: 'category' | 'occasion' | 'url';
  url?: string | null;
  categoryId?: string | null;
  occasionId?: string | null;
  iconName?: string | null;
  columnIndex: number;
  isActive: boolean;
  isHighlighted: boolean;
  badgeText?: string | null;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
}

export interface ReorderEntry {
  id: number;
  parentId: number | null;
  displayOrder: number;
  columnIndex: number;
  isActive: boolean;
}

export interface OccasionRef {
  id: string;
  slug: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class NavAdminService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private nav = inject(NavApiService);

  getMenus(): Observable<AdminNavMenu[]> {
    return this.http.get<AdminNavMenu[]>(`${this.base}/admin/nav/menus`);
  }

  getOccasions(): Observable<OccasionRef[]> {
    return this.http.get<OccasionRef[]>(`${this.base}/occasions`);
  }

  create(code: string, item: NavItemWrite): Observable<AdminNavItem> {
    return this.http
      .post<AdminNavItem>(`${this.base}/admin/nav/${encodeURIComponent(code)}/items`, item)
      .pipe(tap(() => this.nav.invalidate()));
  }

  update(id: number, item: NavItemWrite): Observable<AdminNavItem> {
    return this.http
      .put<AdminNavItem>(`${this.base}/admin/nav/items/${id}`, item)
      .pipe(tap(() => this.nav.invalidate()));
  }

  /** Whole-tree order in one request; a reorder touches every sibling. */
  reorder(code: string, items: ReorderEntry[]): Observable<{ updated: number }> {
    return this.http
      .put<{ updated: number }>(`${this.base}/admin/nav/${encodeURIComponent(code)}/reorder`, { items })
      .pipe(tap(() => this.nav.invalidate()));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/nav/items/${id}`).pipe(tap(() => this.nav.invalidate()));
  }
}
