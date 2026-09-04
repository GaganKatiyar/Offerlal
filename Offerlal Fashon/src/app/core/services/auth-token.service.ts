import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  displayName: string;
  roles: string[];
  mustChangePassword?: boolean;
}

const ACCESS_KEY = 'offerlal_access_v1';
const REFRESH_KEY = 'offerlal_refresh_v1';
const IDENTITY_KEY = 'offerlal_identity_v1';

/**
 * Holds the signed-in session and talks to the auth endpoints.
 *
 * Replaces a client-side credential check — `username === 'admin' && password
 * === 'admin123'` — that lived in shipped JavaScript, so the admin password was
 * readable by anyone who opened devtools. There is now no client-side
 * authorisation decision at all: the server issues a token and every protected
 * endpoint verifies it independently.
 *
 * Tokens are kept in localStorage. That is XSS-readable, which matters, and is
 * the pragmatic choice for an SPA on a separate origin from the API; moving to
 * httpOnly refresh cookies is worth doing once the API and site share a domain.
 * Access tokens are short-lived precisely to bound that exposure.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private http = inject(HttpClient);
  private doc = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private base = environment.apiBaseUrl;

  readonly accessToken = signal<string | null>(this.read(ACCESS_KEY));
  readonly identity = signal<{ displayName: string; roles: string[] } | null>(this.readIdentity());

  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly roles = computed(() => this.identity()?.roles ?? []);

  readonly isAdmin = computed(() =>
    this.roles().some((r) => r === 'Admin' || r === 'Catalog' || r === 'Orders' || r === 'Content'),
  );

  adminLogin(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/admin/login`, { username, password })
      .pipe(tap((res) => this.store(res)));
  }

  customerLogin(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/login`, { username: email, password })
      .pipe(tap((res) => this.store(res)));
  }

  register(payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/register`, payload).pipe(tap((res) => this.store(res)));
  }

  refresh(): Observable<AuthResponse> {
    const token = this.read(REFRESH_KEY);
    return this.http
      .post<AuthResponse>(`${this.base}/auth/refresh`, { refreshToken: token })
      .pipe(tap((res) => this.store(res)));
  }

  logout(): void {
    // Tell the server first so the refresh token family is revoked; a purely
    // client-side logout leaves a valid refresh token in play.
    if (this.accessToken()) {
      this.http.post(`${this.base}/auth/logout`, {}).subscribe({ next: () => {}, error: () => {} });
    }
    this.clear();
  }

  private store(res: AuthResponse): void {
    this.accessToken.set(res.accessToken);
    this.identity.set({ displayName: res.displayName, roles: res.roles });
    this.write(ACCESS_KEY, res.accessToken);
    this.write(REFRESH_KEY, res.refreshToken);
    this.write(IDENTITY_KEY, JSON.stringify({ displayName: res.displayName, roles: res.roles }));
  }

  private clear(): void {
    this.accessToken.set(null);
    this.identity.set(null);
    for (const key of [ACCESS_KEY, REFRESH_KEY, IDENTITY_KEY]) this.remove(key);
  }

  // Storage access is wrapped: private-mode Safari throws on access rather
  // than returning null, and a thrown error here would break app startup.
  private read(key: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return this.doc.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private readIdentity(): { displayName: string; roles: string[] } | null {
    const raw = this.read(IDENTITY_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    if (!this.isBrowser) return;
    try {
      this.doc.defaultView?.localStorage.setItem(key, value);
    } catch {
      // Storage unavailable: the session simply does not survive a reload.
    }
  }

  private remove(key: string): void {
    if (!this.isBrowser) return;
    try {
      this.doc.defaultView?.localStorage.removeItem(key);
    } catch {
      // Nothing to do.
    }
  }
}
