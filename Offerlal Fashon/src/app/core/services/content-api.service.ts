import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContentPage } from '../models/content.model';

/**
 * Reads composed content pages.
 *
 * One request returns the whole page with its products embedded. Fetching each
 * section separately would make the homepage fire N+1 requests before it could
 * paint, which is the one page that cannot afford it.
 */
@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getPage(key: string): Observable<ContentPage> {
    return this.http.get<ContentPage>(`${this.base}/content/pages/${encodeURIComponent(key)}`);
  }
}

// ---------------------------------------------------------------------------
// Admin content client.
// ---------------------------------------------------------------------------

export interface AdminSection {
  id: number;
  type: string;
  eyebrow?: string | null;
  heading?: string | null;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  productRuleId?: number | null;
  rowVersion?: string | null;
  itemCount: number;
  items: AdminSectionItem[];
}

export interface SectionTypeInfo {
  code: string;
  name: string;
  itemKind?: string | null;
  maxItems?: number | null;
}

export interface ProductRuleInfo {
  id: number;
  name: string;
  maxItems: number;
}

export interface AdminPage {
  id: number;
  key: string;
  name: string;
  publishedRevisionId?: number | null;
  sections: AdminSection[];
  sectionTypes: SectionTypeInfo[];
  productRules: ProductRuleInfo[];
}

export interface RevisionInfo {
  id: number;
  publishedAtUtc: string;
  note?: string | null;
  isCurrent: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContentAdminService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  getPage(key: string): Observable<AdminPage> {
    return this.http.get<AdminPage>(`${this.base}/admin/content/pages/${encodeURIComponent(key)}`);
  }

  /**
   * Saves the whole section list in one request.
   *
   * A drag-and-drop reorder changes every section's DisplayOrder at once;
   * sending that as N requests would leave the page half-reordered if one
   * failed partway.
   */
  saveSections(key: string, sections: AdminSection[]): Observable<{ updated: number }> {
    return this.http.put<{ updated: number }>(
      `${this.base}/admin/content/pages/${encodeURIComponent(key)}/sections`,
      { sections },
    );
  }

  publish(key: string, note?: string): Observable<{ revisionId: number; publishedAtUtc: string }> {
    return this.http.post<{ revisionId: number; publishedAtUtc: string }>(
      `${this.base}/admin/content/pages/${encodeURIComponent(key)}/publish`,
      { note },
    );
  }

  // --- Section items --------------------------------------------------------

  createItem(sectionId: number, item: SectionItemWrite): Observable<AdminSectionItem> {
    return this.http.post<AdminSectionItem>(`${this.base}/admin/content/sections/${sectionId}/items`, item);
  }

  updateItem(id: number, item: SectionItemWrite): Observable<AdminSectionItem> {
    return this.http.put<AdminSectionItem>(`${this.base}/admin/content/items/${id}`, item);
  }

  reorderItems(sectionId: number, items: { id: number; displayOrder: number; isActive: boolean }[]) {
    return this.http.put<{ updated: number }>(
      `${this.base}/admin/content/sections/${sectionId}/items/reorder`,
      { items },
    );
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/content/items/${id}`);
  }

  revisions(key: string): Observable<RevisionInfo[]> {
    return this.http.get<RevisionInfo[]>(`${this.base}/admin/content/pages/${encodeURIComponent(key)}/revisions`);
  }
}

export interface AdminSectionItem {
  id: number;
  displayOrder: number;
  itemKind: string;
  title?: string | null;
  subtitle?: string | null;
  caption?: string | null;
  badgeText?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
  mediaAssetId?: number | null;
  mediaUrl?: string | null;
  mediaAlt?: string | null;
  productId?: string | null;
  productName?: string | null;
  categoryId?: string | null;
  occasionId?: string | null;
}

export interface SectionItemWrite {
  itemKind?: string;
  title?: string | null;
  subtitle?: string | null;
  caption?: string | null;
  badgeText?: string | null;
  linkUrl?: string | null;
  isActive: boolean;
  mediaAssetId?: number | null;
  productId?: string | null;
  categoryId?: string | null;
  occasionId?: string | null;
}
