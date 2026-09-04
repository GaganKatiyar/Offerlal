import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenService } from './auth-token.service';

export interface MobileUser {
  displayName: string;
  roles: string[];
  email: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  displayName: string;
  roles: string[];
}

/**
 * Real authentication against the API.
 *
 * What this replaces mattered: login() compared the typed email against a
 * constant in mock-data.ts and accepted ANY password, and the page offered a
 * "fill demo credentials" button. That was fine for a prototype with no
 * backend and is a straightforward account-takeover once there are real
 * accounts, so both are gone.
 *
 * Tokens live in AuthTokenService; this service owns the calls and the
 * derived view of who is signed in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokens = inject(AuthTokenService);
  private base = environment.apiBaseUrl;

  /** Derived from stored tokens, so a restart resumes the session. */
  readonly user = computed<MobileUser | null>(() => {
    const id = this.tokens.identity();
    return id ? { displayName: id.displayName, roles: id.roles, email: id.email } : null;
  });

  readonly isLoggedIn = computed(() => this.tokens.identity() !== null);

  login(email: string, password: string): Observable<MobileUser> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/login`, { username: email.trim(), password })
      .pipe(
        tap((res) => this.store(res, email.trim())),
        map((res) => toUser(res, email.trim())),
      );
  }

  register(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    password: string,
  ): Observable<MobileUser> {
    return this.http
      .post<AuthResponse>(`${this.base}/auth/register`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      })
      .pipe(
        tap((res) => this.store(res, email.trim())),
        map((res) => toUser(res, email.trim())),
      );
  }

  /**
   * Signs out locally first, then tells the server.
   *
   * Local first on purpose: if the network call fails the user must still end
   * up signed out on this device. A logout that only works online is not a
   * logout.
   */
  logout(): void {
    const refreshToken = this.tokens.refreshToken;
    this.tokens.clear();
    if (refreshToken) {
      this.http.post(`${this.base}/auth/logout`, { refreshToken }).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    }
  }

  private store(res: AuthResponse, email: string): void {
    this.tokens.save(res.accessToken, res.refreshToken, {
      displayName: res.displayName,
      roles: res.roles ?? [],
      email,
    });
  }
}

function toUser(res: AuthResponse, email: string): MobileUser {
  return { displayName: res.displayName, roles: res.roles ?? [], email };
}
