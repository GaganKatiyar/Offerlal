import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

interface StockRow {
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  reserved: number;
  sold: number;
  lowThreshold: number;
  movement: 'fast' | 'slow' | 'dead';
  daysSinceCreated: number;
}

type MovementFilter = 'all' | 'fast' | 'slow' | 'dead' | 'low-stock';

@Component({
  selector: 'app-stock-table',
  standalone: true,
  imports: [InrCurrencyPipe],
  templateUrl: './stock-table.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTable {
  private store = inject(DemoDataStoreService);
  protected filter = signal<MovementFilter>('all');
  protected query = signal('');

  private now = new Date('2026-08-16');

  protected rows = computed<StockRow[]>(() => {
    const orders = this.store.orders().filter((o) => o.status !== 'Cancelled');
    const soldBySku = new Map<string, number>();
    orders.forEach((o) => o.items.forEach((item) => soldBySku.set(item.sku, (soldBySku.get(item.sku) ?? 0) + item.quantity)));

    const result: StockRow[] = [];
    this.store.products().forEach((p) => {
      const daysSinceCreated = Math.floor((this.now.getTime() - new Date(p.createdAt).getTime()) / 86400000);
      p.variants.forEach((v) => {
        v.skus.forEach((s) => {
          const sold = soldBySku.get(s.sku) ?? 0;
          let movement: StockRow['movement'] = 'slow';
          if (sold >= 3) movement = 'fast';
          else if (sold === 0 && daysSinceCreated > 60) movement = 'dead';
          result.push({
            productId: p.id,
            productName: p.name,
            sku: s.sku,
            size: s.size,
            color: v.color,
            purchasePrice: Math.round(p.price * 0.55),
            sellingPrice: p.price,
            stock: s.stock,
            reserved: Math.min(s.stock, Math.round(sold * 0.15)),
            sold,
            lowThreshold: 3,
            movement,
            daysSinceCreated,
          });
        });
      });
    });
    return result;
  });

  protected filtered = computed(() => {
    const f = this.filter();
    const q = this.query().toLowerCase();
    return this.rows().filter((r) => {
      if (q && !r.productName.toLowerCase().includes(q) && !r.sku.toLowerCase().includes(q)) return false;
      if (f === 'low-stock') return r.stock <= r.lowThreshold;
      if (f !== 'all') return r.movement === f;
      return true;
    });
  });

  protected fastCount = computed(() => this.rows().filter((r) => r.movement === 'fast').length);
  protected slowCount = computed(() => this.rows().filter((r) => r.movement === 'slow').length);
  protected deadCount = computed(() => this.rows().filter((r) => r.movement === 'dead').length);
  protected lowStockCount = computed(() => this.rows().filter((r) => r.stock <= r.lowThreshold).length);
}
