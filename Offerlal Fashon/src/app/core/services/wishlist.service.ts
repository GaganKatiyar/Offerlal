import { Injectable, computed, signal } from '@angular/core';
import { WishlistItem } from '../models';

const STORAGE_KEY = 'offerlal_wishlist_v1';

function loadFromStorage(): WishlistItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly _items = signal<WishlistItem[]>(loadFromStorage());
  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
  }

  has(productId: string): boolean {
    return this._items().some((i) => i.productId === productId);
  }

  toggle(productId: string): void {
    if (this.has(productId)) {
      this.remove(productId);
    } else {
      this._items.update((list) => [...list, { id: `wish-${productId}-${Date.now()}`, productId, addedAt: new Date().toISOString() }]);
      this.persist();
    }
  }

  remove(productId: string): void {
    this._items.update((list) => list.filter((i) => i.productId !== productId));
    this.persist();
  }

  clear(): void {
    this._items.set([]);
    this.persist();
  }
}
