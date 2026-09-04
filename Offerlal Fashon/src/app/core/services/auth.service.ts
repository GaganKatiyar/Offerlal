import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Customer } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';
import { AuthTokenService } from './auth-token.service';

const SESSION_KEY = 'offerlal_session_v1';

interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokens = inject(AuthTokenService);
  private store = inject(DemoDataStoreService);

  private readonly _currentUserId = signal<string | null>(this.readSession());
  readonly currentUser = computed<Customer | null>(() => {
    const id = this._currentUserId();
    if (!id) return null;
    return this.store.customers().find((c) => c.id === id) ?? null;
  });
  readonly isLoggedIn = computed(() => this._currentUserId() !== null);

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


  /** Demo login: matches by email only (any password is accepted) since there is no real backend. */
  login(email: string, _password: string): Observable<Customer> {
    const customer = this.store.customers().find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
    if (!customer) {
      return throwError(() => new Error('No account found for that email address.')).pipe(delay(400));
    }
    return of(customer).pipe(
      delay(500),
      tap((c) => this.setSession(c.id)),
    );
  }

  loginWithOtp(phone: string, _otp: string): Observable<Customer> {
    const customer = this.store.customers().find((c) => c.phone === phone.trim());
    if (!customer) {
      return throwError(() => new Error('No account found for that mobile number.')).pipe(delay(400));
    }
    return of(customer).pipe(
      delay(500),
      tap((c) => this.setSession(c.id)),
    );
  }

  register(input: RegisterInput): Observable<Customer> {
    const id = `cust-${Date.now()}`;
    const customer: Customer = {
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      city: input.city,
      state: input.state,
      registeredAt: new Date().toISOString(),
      segment: 'New',
      totalOrders: 0,
      totalSpend: 0,
      addresses: [],
    };
    return of(customer).pipe(
      delay(500),
      tap((c) => {
        this.store.addCustomer(c);
        this.setSession(c.id);
      }),
    );
  }

  logout(): void {
    this._currentUserId.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
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
