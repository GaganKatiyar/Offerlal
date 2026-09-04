import { Injectable, signal } from '@angular/core';

const ACCESS_KEY = 'offerlal_mobile_access_v1';
const REFRESH_KEY = 'offerlal_mobile_refresh_v1';
const IDENTITY_KEY = 'offerlal_mobile_identity_v1';

export interface StoredIdentity {
  displayName: string;
  roles: string[];
  /**
   * The address used to sign in.
   *
   * Neither the login response nor /auth/me returns an email, and the account
   * screen shows one. This is what the customer typed - their own address, so
   * echoing it back is honest - rather than anything the server asserted.
   */
  email: string;
}

/**
 * Token storage for the app.
 *
 * localStorage inside the Capacitor WebView, which persists across app launches
 * on device and is scoped to the app's own origin. It is not encrypted at rest,
 * so this holds a short-lived access token and a rotating refresh token and
 * nothing else — no card details, no password.
 *
 * Every read is wrapped: a WebView can start with storage unavailable (a
 * cleared profile, a restricted context), and an exception thrown from a
 * service constructor takes the whole app down at boot rather than logging
 * someone out.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  /** Signal rather than a getter so guards and the shell react to sign-out. */
  readonly identity = signal<StoredIdentity | null>(this.readIdentity());

  get accessToken(): string | null {
    return this.read(ACCESS_KEY);
  }

  get refreshToken(): string | null {
    return this.read(REFRESH_KEY);
  }

  save(accessToken: string, refreshToken: string, identity: StoredIdentity): void {
    this.write(ACCESS_KEY, accessToken);
    this.write(REFRESH_KEY, refreshToken);
    this.write(IDENTITY_KEY, JSON.stringify(identity));
    this.identity.set(identity);
  }

  /** Replaces just the pair after a refresh; the identity is unchanged. */
  saveTokens(accessToken: string, refreshToken: string): void {
    this.write(ACCESS_KEY, accessToken);
    this.write(REFRESH_KEY, refreshToken);
  }

  clear(): void {
    for (const key of [ACCESS_KEY, REFRESH_KEY, IDENTITY_KEY]) this.remove(key);
    this.identity.set(null);
  }

  private readIdentity(): StoredIdentity | null {
    const raw = this.read(IDENTITY_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredIdentity;
    } catch {
      // Corrupt entry: drop it rather than booting into a broken session.
      this.remove(IDENTITY_KEY);
      return null;
    }
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Storage unavailable: the session lasts until the app is closed. */
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Nothing to do. */
    }
  }
}
