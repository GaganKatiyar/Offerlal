import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MobileProduct } from '../data/mock-data';

export interface CartLine {
  product: MobileProduct;
  /** The purchasable variant. Empty only for lines added before variants existed. */
  variantId: string;
  size: string;
  quantity: number;
}

/** What the server says this bag costs. The client never computes it. */
export interface Quote {
  lines: {
    productId: string;
    variantId: string;
    sku: string;
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    availableStock: number;
    inStock: boolean;
  }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  couponCode?: string | null;
  problems?: string[];
}

const STORAGE_KEY = 'offerlal_mobile_bag_v1';

/**
 * The bag.
 *
 * Holds WHAT the customer wants — product, variant, size, quantity — and asks
 * the server WHAT IT COSTS. The subtotal used to be computed here as
 * `price * quantity`, which is the same mistake the website was corrected for:
 * a total the client calculates is a total the client can be made to calculate
 * wrongly, and it silently drifts from the server's answer the moment a price
 * changes or an offer applies.
 *
 * Persisted, because a bag that empties when the OS evicts a backgrounded app
 * is worse than no bag at all.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  private readonly _lines = signal<CartLine[]>(this.restore());
  readonly lines = this._lines.asReadonly();

  /** Server-priced totals; null until a quote has been fetched. */
  private readonly _quote = signal<Quote | null>(null);
  readonly quote = this._quote.asReadonly();

  readonly quoting = signal(false);
  readonly quoteFailed = signal(false);

  /** Count is a pure tally of what the customer chose, so it stays local. */
  readonly count = computed(() => this._lines().reduce((sum, l) => sum + l.quantity, 0));

  /**
   * The server's subtotal, or null before the first quote.
   *
   * Deliberately NOT a local sum with the quote as an "enhancement": a number
   * that is right most of the time is harder to notice being wrong than one
   * that is absent until it is known.
   */
  readonly subtotal = computed(() => this._quote()?.subtotal ?? null);
  readonly total = computed(() => this._quote()?.total ?? null);

  add(product: MobileProduct, size: string, variantId?: string): void {
    const variant = variantId ?? product.variants?.[0]?.id ?? '';
    const existing = this._lines().find(
      (l) => l.product.id === product.id && l.size === size && l.variantId === variant,
    );

    if (existing) {
      this._lines.update((list) =>
        list.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)),
      );
    } else {
      this._lines.update((list) => [...list, { product, variantId: variant, size, quantity: 1 }]);
    }
    this.commit();
  }

  updateQuantity(line: CartLine, quantity: number): void {
    if (quantity <= 0) {
      this.remove(line);
      return;
    }
    this._lines.update((list) => list.map((l) => (l === line ? { ...l, quantity } : l)));
    this.commit();
  }

  remove(line: CartLine): void {
    this._lines.update((list) => list.filter((l) => l !== line));
    this.commit();
  }

  clear(): void {
    this._lines.set([]);
    this._quote.set(null);
    this.persist([]);
  }

  /**
   * Asks the server what the bag costs.
   *
   * Also the stock check: the quote reports availableStock per line, so the bag
   * screen can flag something that sold out while it sat there rather than
   * letting checkout fail at the last step.
   */
  refreshQuote(couponCode?: string | null, expressDelivery = false): Observable<Quote> {
    this.quoting.set(true);
    this.quoteFailed.set(false);

    const request = {
      lines: this._lines().map((l) => ({
        productId: l.product.id,
        variantId: l.variantId,
        size: l.size,
        quantity: l.quantity,
      })),
      couponCode: couponCode ?? null,
      expressDelivery,
    };

    return this.http.post<Quote>(`${this.base}/checkout/quote`, request).pipe(
      tap({
        next: (q) => {
          this._quote.set(q);
          this.quoting.set(false);
        },
        error: () => {
          this.quoting.set(false);
          this.quoteFailed.set(true);
          // Drop the stale quote rather than keep showing a total that no
          // longer corresponds to what is in the bag.
          this._quote.set(null);
        },
      }),
    );
  }

  private commit(): void {
    this.persist(this._lines());
    // Any change to the bag invalidates the priced total immediately, so no
    // screen can show an old total next to new contents.
    this._quote.set(null);
  }

  private restore(): CartLine[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return (parsed as CartLine[]).filter((l) => l?.product?.id && l.size && l.quantity > 0);
    } catch {
      return [];
    }
  }

  private persist(lines: CartLine[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* Storage unavailable: the bag lasts until the app is closed. */
    }
  }
}
