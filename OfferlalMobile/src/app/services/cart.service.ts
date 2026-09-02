import { Injectable, computed, signal } from '@angular/core';
import { MobileProduct } from '../data/mock-data';

export interface CartLine {
  product: MobileProduct;
  size: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _lines = signal<CartLine[]>([]);
  readonly lines = this._lines.asReadonly();

  readonly count = computed(() => this._lines().reduce((sum, l) => sum + l.quantity, 0));
  readonly subtotal = computed(() => this._lines().reduce((sum, l) => sum + l.product.price * l.quantity, 0));

  add(product: MobileProduct, size: string): void {
    const existing = this._lines().find((l) => l.product.id === product.id && l.size === size);
    if (existing) {
      this._lines.update((list) =>
        list.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)),
      );
      return;
    }
    this._lines.update((list) => [...list, { product, size, quantity: 1 }]);
  }

  updateQuantity(line: CartLine, quantity: number): void {
    if (quantity <= 0) {
      this.remove(line);
      return;
    }
    this._lines.update((list) => list.map((l) => (l === line ? { ...l, quantity } : l)));
  }

  remove(line: CartLine): void {
    this._lines.update((list) => list.filter((l) => l !== line));
  }
}
