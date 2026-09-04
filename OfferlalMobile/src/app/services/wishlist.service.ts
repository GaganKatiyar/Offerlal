import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'offerlal_mobile_wishlist_v1';

/**
 * The wishlist, as a set of product ids.
 *
 * Persisted to localStorage. It was previously in-memory only, so every saved
 * item was lost when the app was closed — on a phone, where the OS evicts
 * backgrounded apps freely, that meant the wishlist rarely survived at all.
 *
 * Still device-local: there is no server wishlist yet, so it does not follow
 * the customer to another device or the website.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly _ids = signal<Set<string>>(this.restore());
  readonly ids = this._ids.asReadonly();

  has(productId: string): boolean {
    return this._ids().has(productId);
  }

  toggle(productId: string): void {
    const next = new Set(this._ids());
    next.has(productId) ? next.delete(productId) : next.add(productId);
    this._ids.set(next);
    this.persist(next);
  }

  private restore(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private persist(ids: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      /* Storage unavailable: the list lasts until the app is closed. */
    }
  }
}
