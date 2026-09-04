import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MediaAsset {
  id: number;
  url: string;
  altText?: string | null;
  contentType: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  folder: string;
  tags?: string | null;
  createdAt: string;
  isOwned: boolean;
  derivativeWidths: number[];
}

export interface MediaFolder {
  folder: string;
  count: number;
}

export interface MediaPage {
  items: MediaAsset[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
}

/**
 * The media library client.
 *
 * The API has been complete and authorised since the media work — list, folders,
 * upload, alt-text patch — with no frontend consumer at all. This is that
 * consumer.
 */
@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  list(folder?: string | null, q?: string | null, page = 1, pageSize = 40): Observable<MediaPage> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (folder) params = params.set('folder', folder);
    if (q) params = params.set('q', q);
    return this.http.get<MediaPage>(`${this.base}/media`, { params });
  }

  folders(): Observable<MediaFolder[]> {
    return this.http.get<MediaFolder[]>(`${this.base}/media/folders`);
  }

  upload(file: File, folder: string, altText?: string): Observable<MediaAsset> {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    if (altText) form.append('altText', altText);
    // No Content-Type header: the browser must set the multipart boundary, and
    // setting it manually produces a request the server cannot parse.
    return this.http.post<MediaAsset>(`${this.base}/media/upload`, form);
  }

  updateAlt(id: number, altText: string): Observable<MediaAsset> {
    return this.http.patch<MediaAsset>(`${this.base}/media/${id}`, { altText });
  }
}
