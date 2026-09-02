import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly _ids = signal<Set<string>>(new Set());
  readonly ids = this._ids.asReadonly();

  has(productId: string): boolean {
    return this._ids().has(productId);
  }

  toggle(productId: string): void {
    const next = new Set(this._ids());
    next.has(productId) ? next.delete(productId) : next.add(productId);
    this._ids.set(next);
  }
}
