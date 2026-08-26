import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem, CartItemCustomization, Product, ProductVariant } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

const STORAGE_KEY = 'offerlal_cart_v1';

function loadFromStorage(): CartItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private store = inject(DemoDataStoreService);

  private readonly _items = signal<CartItem[]>(loadFromStorage());
  readonly items = this._items.asReadonly();

  readonly isDrawerOpen = signal(false);
  openDrawer(): void {
    this.isDrawerOpen.set(true);
  }
  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  readonly count = computed(() => this._items().reduce((sum, i) => sum + i.quantity, 0));

  readonly subtotal = computed(() =>
    this._items().reduce((sum, i) => {
      const customTotal = i.customizations.reduce((s, c) => s + c.priceDelta, 0);
      return sum + (i.unitPrice + customTotal) * i.quantity;
    }, 0),
  );

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
  }

  add(product: Product, variant: ProductVariant, size: string, quantity = 1, customizations: CartItemCustomization[] = []): void {
    const skuEntry = variant.skus.find((s) => s.size === size) ?? variant.skus[0];
    const existing = this._items().find(
      (i) => i.productId === product.id && i.variantId === variant.id && i.size === size && JSON.stringify(i.customizations) === JSON.stringify(customizations),
    );
    if (existing) {
      this.updateQuantity(existing.id, existing.quantity + quantity);
      return;
    }
    const item: CartItem = {
      id: `cart-${product.id}-${variant.id}-${size}-${Date.now()}`,
      productId: product.id,
      variantId: variant.id,
      sku: skuEntry.sku,
      size,
      color: variant.color,
      quantity,
      unitPrice: product.price,
      customizations,
      addedAt: new Date().toISOString(),
    };
    this._items.update((list) => [...list, item]);
    this.persist();
  }

  remove(itemId: string): void {
    this._items.update((list) => list.filter((i) => i.id !== itemId));
    this.persist();
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(itemId);
      return;
    }
    this._items.update((list) => list.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
    this.persist();
  }

  clear(): void {
    this._items.set([]);
    this.persist();
  }

  productFor(item: CartItem): Product | undefined {
    return this.store.products().find((p) => p.id === item.productId);
  }
}
