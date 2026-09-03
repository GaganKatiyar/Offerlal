import { Injectable, signal } from '@angular/core';
import { MOCK_ORDERS, MobileAddress, MobileOrder } from '../data/mock-data';
import { CartLine } from './cart.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly _orders = signal<MobileOrder[]>([...MOCK_ORDERS]);
  readonly orders = this._orders.asReadonly();

  getByOrderNumber(orderNumber: string): MobileOrder | undefined {
    return this._orders().find((o) => o.orderNumber === orderNumber);
  }

  place(lines: CartLine[], address: MobileAddress, paymentMethod: string): MobileOrder {
    const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
    const shippingFee = subtotal >= 2999 ? 0 : 150;
    const total = subtotal + shippingFee;
    const seq = this._orders().length + 1;
    const now = new Date();
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 9);

    const order: MobileOrder = {
      id: `order-${Date.now()}`,
      orderNumber: `OF-2026-${100000 + seq}`,
      items: lines.map((l) => ({
        productId: l.product.id,
        name: l.product.name,
        imageUrl: l.product.imageUrl,
        size: l.size,
        color: l.product.colors[0]?.name ?? '',
        quantity: l.quantity,
        unitPrice: l.product.price,
      })),
      subtotal,
      shippingFee,
      total,
      status: 'Placed',
      statusHistory: [{ status: 'Placed', timestamp: now.toISOString() }],
      shippingAddress: address,
      paymentMethod,
      placedAt: now.toISOString(),
      expectedDeliveryDate: expected.toISOString(),
    };

    this._orders.update((list) => [order, ...list]);
    return order;
  }
}
