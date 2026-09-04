import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
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
