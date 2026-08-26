import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Address, Order, OrderItem, PaymentMethod } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';
import { CartService } from './cart.service';

export interface CreateOrderInput {
  customerId: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  discount?: number;
  shippingFee?: number;
  expressDelivery?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private store = inject(DemoDataStoreService);
  private cart = inject(CartService);

  getByCustomer(customerId: string): Observable<Order[]> {
    return of(
      this.store
        .orders()
        .filter((o) => o.customerId === customerId)
        .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt)),
    ).pipe(delay(200));
  }

  getByOrderNumber(orderNumber: string): Observable<Order | undefined> {
    return of(this.store.orders().find((o) => o.orderNumber === orderNumber)).pipe(delay(200));
  }

  getById(id: string): Observable<Order | undefined> {
    return of(this.store.orders().find((o) => o.id === id)).pipe(delay(200));
  }

  create(input: CreateOrderInput): Observable<Order> {
    const items: OrderItem[] = this.cart.items().map((ci) => {
      const product = this.cart.productFor(ci);
      const customTotal = ci.customizations.reduce((s, c) => s + c.priceDelta, 0);
      return {
        productId: ci.productId,
        name: product?.name ?? 'Product',
        imageUrl: product?.variants[0]?.images[0]?.url ?? '',
        sku: ci.sku,
        size: ci.size,
        color: ci.color,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice + customTotal,
        lineTotal: (ci.unitPrice + customTotal) * ci.quantity,
        customizations: ci.customizations.map((c) => c.label),
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discount = input.discount ?? 0;
    const shippingFee = input.shippingFee ?? (subtotal - discount >= 2999 ? 0 : input.expressDelivery ? 250 : 150);
    const total = subtotal - discount + shippingFee;
    const seq = this.store.orders().length + 1;
    const now = new Date();
    const expected = new Date(now);
    expected.setDate(expected.getDate() + (input.expressDelivery ? 5 : 9));

    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber: `OF-2026-${100000 + seq}`,
      customerId: input.customerId,
      items,
      subtotal,
      discount,
      couponCode: input.couponCode,
      shippingFee,
      tax: 0,
      total,
      status: 'Placed',
      statusHistory: [{ status: 'Placed', timestamp: now.toISOString() }],
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'COD' ? 'Pending' : 'Paid',
      placedAt: now.toISOString(),
      expectedDeliveryDate: expected.toISOString(),
    };

    return of(order).pipe(
      delay(700),
      tap((o) => {
        this.store.addOrder(o);
        if (input.couponCode) this.store.incrementCouponUsage(input.couponCode);
        this.cart.clear();
      }),
    );
  }
}
