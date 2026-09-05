import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Customer } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';
import { AccountApiService } from './account-api.service';
import { AuthTokenService } from './auth-token.service';

const SESSION_KEY = 'offerlal_session_v1';
const EMAIL_KEY = 'offerlal_email_v1';

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokens = inject(AuthTokenService);
  private account = inject(AccountApiService);
  private store = inject(DemoDataStoreService);

  private readonly _currentUserId = signal<string | null>(this.readSession());

  /**
   * The signed-in customer, derived from the stored token identity.
   *
   * It was looked up in DemoDataStoreService, which resets on reload, so a
   * signed-in customer became null on refresh unless they happened to be one of
   * the seeded demo people.
   *
   * The token carries a display name and roles, not a full customer record --
   * orders and addresses are fetched separately and scoped by the token -- so
   * this fills the fields the header and account nav actually read and leaves
   * the rest empty rather than inventing values.
   */
  readonly currentUser = computed<Customer | null>(() => {
    const identity = this.tokens.identity();
    if (!identity || !this.tokens.isCustomer()) return null;

    const parts = (identity.displayName || '').trim().split(/\s+/);
    return {
      id: this._currentUserId() ?? '',
      firstName: parts[0] || 'there',
      lastName: parts.slice(1).join(' '),
      email: this.readEmail() ?? '',
      phone: '',
      city: '',
      state: '',
      registeredAt: '',
      segment: 'New',
      totalOrders: 0,
      totalSpend: 0,
      addresses: [],
    } as Customer;
  });

  readonly isLoggedIn = computed(() => this.tokens.isCustomer());

  /**
   * Whether the current session can reach the back office.
   *
   * Derived from the token service's persisted identity rather than a
   * standalone localStorage flag. The flag version broke as soon as sign-in
   * moved to the API: nothing wrote it any more, so a page reload logged the
   * admin straight back out — and it was never a security control anyway,
   * because the server re-checks the token on every protected request.
   */
  readonly isAdmin = computed(() => this.tokens.isAdmin());

  private readSession(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(SESSION_KEY);
  }

  /**
   * The address used to sign in.
   *
   * Neither the login response nor /auth/me returns an email, and the account
   * screen shows one. This is what the customer typed -- their own address --
   * rather than anything the server asserted.
   */
  private readEmail(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(EMAIL_KEY);
  }

  private rememberEmail(email: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(EMAIL_KEY, email);
  }


  /**
   * Sign in, against the API.
   *
   * This accepted ANY password and matched on email alone -- its own comment
   * said so. That was survivable while there were no real accounts and is
   * straightforward account takeover now there are. The app was corrected
   * first; this is the same fix for the website.
   */
  login(email: string, password: string): Observable<Customer> {
    return this.tokens.customerLogin(email.trim(), password).pipe(
      tap(() => this.rememberEmail(email.trim())),
      map(() => this.currentUser() as Customer),
    );
  }

  /**
   * Phone OTP sign-in.
   *
   * There is no OTP endpoint yet, and what was here signed someone in on a
   * matching phone number with the code ignored entirely -- worse than not
   * offering it. It now refuses, so the UI sends people to email sign-in rather
   * than appearing to work.
   */
  loginWithOtp(_phone: string, _otp: string): Observable<Customer> {
    return throwError(
      () => new Error('Please sign in with your email and password -- OTP is not available yet.'),
    ).pipe(delay(200));
  }

  register(input: RegisterInput): Observable<Customer> {
    return this.tokens
      .register({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.trim(),
        phone: input.phone,
        password: input.password,
      })
      .pipe(
        tap(() => this.rememberEmail(input.email.trim())),
        map(() => this.currentUser() as Customer),
      );
  }

  logout(): void {
    this._currentUserId.set(null);
    // Clears tokens AND tells the server, so the refresh family is revoked.
    // Dropping only the local flag left a usable refresh token behind.
    this.tokens.logout();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(EMAIL_KEY);
    }
    // Addresses are a real person's home address and phone number, cached in
    // memory. Signing out must not leave them for whoever signs in next on a
    // shared machine.
    this.account.clear();
  }

  /**
   * Admin sign-in, against the API.
   *
   * Was a client-side comparison against 'admin' / 'admin123' in shipped
   * JavaScript — the credentials were readable by anyone who opened devtools,
   * and setting a localStorage flag was the entire authorisation check. There
   * is now no client-side authorisation decision: the server issues a token
   * and every protected endpoint verifies it independently, so faking the flag
   * gains nothing.
   */
  loginAdmin(username: string, password: string): Observable<boolean> {
    return this.tokens.adminLogin(username, password).pipe(
      map(() => true),
    );
  }

  logoutAdmin(): void {
    this.tokens.logout();
  }

  private setSession(id: string): void {
    this._currentUserId.set(id);
    if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, id);
  }
}
