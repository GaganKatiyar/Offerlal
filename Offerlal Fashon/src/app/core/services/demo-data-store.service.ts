import { Injectable, signal, computed } from '@angular/core';
import { Product, Order, Customer, Coupon, Review, OrderStatus, CustomerSegment } from '../models';
import { CATEGORIES, OCCASIONS, BUDGET_TIERS } from '../demo-data/categories.data';
import { PRODUCTS } from '../demo-data/products.data';
import { CUSTOMERS } from '../demo-data/customers.data';
import { ORDERS } from '../demo-data/orders.data';
import { REVIEWS } from '../demo-data/reviews.data';
import { COUPONS } from '../demo-data/coupons.data';

/**
 * Single in-memory source of truth for all demo data. Storefront and admin
 * feature services both read/write through this store, so an edit made in
 * admin (e.g. a price change or order status update) is visible immediately
 * on the storefront in the same session — this is what stands in for a real
 * backend + database in this frontend-only prototype.
 */
@Injectable({ providedIn: 'root' })
export class DemoDataStoreService {
  readonly categories = signal(CATEGORIES);
  readonly occasions = signal(OCCASIONS);
  readonly budgetTiers = signal(BUDGET_TIERS);
  readonly products = signal<Product[]>(PRODUCTS);
  readonly orders = signal<Order[]>(ORDERS);
  readonly rawCustomers = signal<Customer[]>(CUSTOMERS);
  readonly reviews = signal<Review[]>(REVIEWS);
  readonly coupons = signal<Coupon[]>(COUPONS);

  /** Customers with totalOrders/totalSpend/segment recomputed from actual order data. */
  readonly customers = computed<Customer[]>(() => {
    const orders = this.orders();
    return this.rawCustomers().map((c) => {
      const own = orders.filter((o) => o.customerId === c.id && o.status !== 'Cancelled');
      const totalOrders = own.length;
      const totalSpend = own.reduce((sum, o) => sum + o.total, 0);
      const segment: CustomerSegment =
        totalSpend >= 100000 ? 'High-Value' : c.segment === 'Bridal' ? 'Bridal' : c.segment === 'VIP' ? 'VIP' : totalOrders >= 2 ? 'Repeat' : 'New';
      return { ...c, totalOrders, totalSpend, segment };
    });
  });

  // ── Products ──────────────────────────────────────────────
  updateProduct(id: string, patch: Partial<Product>): void {
    this.products.update((list) => list.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)));
  }

  addProduct(product: Product): void {
    this.products.update((list) => [product, ...list]);
  }

  deleteProduct(id: string): void {
    this.products.update((list) => list.filter((p) => p.id !== id));
  }

  adjustStock(productId: string, variantId: string, sku: string, delta: number): void {
    this.products.update((list) =>
      list.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: p.variants.map((v) =>
            v.id !== variantId
              ? v
              : { ...v, skus: v.skus.map((s) => (s.sku === sku ? { ...s, stock: Math.max(0, s.stock + delta) } : s)) },
          ),
        };
      }),
    );
  }

  // ── Orders ────────────────────────────────────────────────
  addOrder(order: Order): void {
    this.orders.update((list) => [order, ...list]);
  }

  updateOrderStatus(orderId: string, status: OrderStatus, note?: string): void {
    this.orders.update((list) =>
      list.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              status,
              statusHistory: [...o.statusHistory, { status, timestamp: new Date().toISOString(), note }],
            },
      ),
    );
  }

  // ── Customers ─────────────────────────────────────────────
  addCustomer(customer: Customer): void {
    this.rawCustomers.update((list) => [customer, ...list]);
  }

  // ── Coupons ───────────────────────────────────────────────
  addCoupon(coupon: Coupon): void {
    this.coupons.update((list) => [coupon, ...list]);
  }

  updateCoupon(id: string, patch: Partial<Coupon>): void {
    this.coupons.update((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  deleteCoupon(id: string): void {
    this.coupons.update((list) => list.filter((c) => c.id !== id));
  }

  incrementCouponUsage(code: string): void {
    this.coupons.update((list) => list.map((c) => (c.code === code ? { ...c, usedCount: c.usedCount + 1 } : c)));
  }
}
