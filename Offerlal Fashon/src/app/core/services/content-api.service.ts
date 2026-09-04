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
