import { Injectable, signal } from '@angular/core';
import { Product } from '../models';

@Injectable({ providedIn: 'root' })
export class QuickViewService {
  readonly product = signal<Product | null>(null);

  open(product: Product): void {
    this.product.set(product);
  }

  close(): void {
    this.product.set(null);
  }
}
