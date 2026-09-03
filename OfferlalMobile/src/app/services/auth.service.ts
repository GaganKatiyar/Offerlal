import { Injectable, signal } from '@angular/core';
import { CURRENT_USER } from '../data/mock-data';

export interface MobileUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const STORAGE_KEY = 'offerlal_mobile_session_v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<MobileUser | null>(this.readStoredSession());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = signal(this._user() !== null);

  private readStoredSession(): MobileUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Demo login: matches by email only, any password accepted (no real backend yet). */
  login(email: string, _password: string): boolean {
    if (email.trim().toLowerCase() !== CURRENT_USER.email.toLowerCase()) return false;
    this.setSession(CURRENT_USER);
    return true;
  }

  register(firstName: string, lastName: string, email: string, phone: string): void {
    this.setSession({ firstName, lastName, email, phone });
  }

  logout(): void {
    this._user.set(null);
    this.isLoggedIn.set(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  private setSession(user: MobileUser): void {
    this._user.set(user);
    this.isLoggedIn.set(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}
