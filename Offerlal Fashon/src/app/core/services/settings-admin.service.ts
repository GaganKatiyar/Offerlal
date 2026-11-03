import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NavApiService } from './nav-api.service';

export interface StoreSetting {
  key: string;
  value: string | null;
  valueType: string;
  group: string;
  description?: string | null;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsAdminService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private nav = inject(NavApiService);

  getAll(): Observable<StoreSetting[]> {
    return this.http.get<StoreSetting[]>(`${this.base}/admin/settings`);
  }

  update(settings: { key: string; value: string }[]): Observable<{ updated: number }> {
    return this.http
      .put<{ updated: number }>(`${this.base}/admin/settings`, { settings })
      // Public settings are shareReplay-cached for the session, so without this
      // the announcement bar and shipping copy keep showing the old values
      // until a full reload.
      .pipe(tap(() => this.nav.invalidate()));
  }
}
