import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MobileAddress } from '../data/mock-data';

/**
 * Saved addresses, from the server.
 *
 * This used to be seeded from MOCK_ADDRESSES, which was not a cosmetic
 * shortcut: checkout preselected the first entry, so a real customer who did
 * not read the address block would have shipped their order to "Ananya Sharma"
 * at a fabricated address. An empty list is the correct starting state for
 * someone who has not saved one.
 *
 * Addresses are per-customer on the server, so the list is reloaded on sign-in
 * rather than cached across sessions.
 */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private readonly _addresses = signal<MobileAddress[]>([]);
  readonly addresses = this._addresses.asReadonly();

  readonly loading = signal(false);
  readonly failed = signal(false);

  /** Fetches the signed-in customer's addresses. Safe to call repeatedly. */
  load(): Observable<MobileAddress[]> {
    this.loading.set(true);
    this.failed.set(false);
    return this.http.get<MobileAddress[]>(`${this.base}/addresses`).pipe(
      tap({
        next: (rows) => {
          this._addresses.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
          // Not signed in, or offline. An empty list is honest; stale addresses
          // from another account would not be.
          this._addresses.set([]);
        },
      }),
    );
  }

  add(address: Omit<MobileAddress, 'id'>): Observable<MobileAddress> {
    return this.http
      .post<MobileAddress>(`${this.base}/addresses`, address)
      .pipe(tap((created) => this._addresses.update((list) => [...list, created])));
  }

  update(id: string, address: Omit<MobileAddress, 'id'>): Observable<MobileAddress> {
    return this.http
      .put<MobileAddress>(`${this.base}/addresses/${id}`, address)
      .pipe(tap((saved) => this._addresses.update((list) => list.map((a) => (a.id === id ? saved : a)))));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/addresses/${id}`).pipe(
      // Reload rather than splice: deleting the default promotes another one
      // server-side, and the list has to reflect which.
      tap(() => this.load().subscribe({ next: () => undefined, error: () => undefined })),
    );
  }

  setDefault(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/addresses/${id}/default`, {}).pipe(
      tap(() =>
        this._addresses.update((list) => list.map((a) => ({ ...a, isDefault: a.id === id }))),
      ),
    );
  }

  /** Clears the list on sign-out, so the next customer never sees these. */
  clear(): void {
    this._addresses.set([]);
  }
}
