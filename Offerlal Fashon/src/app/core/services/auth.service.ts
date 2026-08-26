import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { Customer } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

const SESSION_KEY = 'offerlal_session_v1';
const ADMIN_KEY = 'offerlal_admin_session_v1';

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
  private store = inject(DemoDataStoreService);

  private readonly _currentUserId = signal<string | null>(this.readSession());
  readonly currentUser = computed<Customer | null>(() => {
    const id = this._currentUserId();
    if (!id) return null;
    return this.store.customers().find((c) => c.id === id) ?? null;
  });
  readonly isLoggedIn = computed(() => this._currentUserId() !== null);

  readonly isAdmin = signal<boolean>(this.readAdminSession());

  private readSession(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(SESSION_KEY);
  }

  private readAdminSession(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(ADMIN_KEY) === 'true';
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

  loginAdmin(username: string, password: string): Observable<boolean> {
    const ok = username.trim().toLowerCase() === 'admin' && password === 'admin123';
    if (!ok) return throwError(() => new Error('Invalid admin credentials.')).pipe(delay(400));
    return of(true).pipe(
      delay(400),
      map(() => true),
      tap(() => {
        this.isAdmin.set(true);
        if (typeof localStorage !== 'undefined') localStorage.setItem(ADMIN_KEY, 'true');
      }),
    );
  }

  logoutAdmin(): void {
    this.isAdmin.set(false);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(ADMIN_KEY);
  }

  private setSession(id: string): void {
    this._currentUserId.set(id);
    if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, id);
  }
}
