import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-admin-product-list',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe],
  templateUrl: './product-list.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList {
  private store = inject(DemoDataStoreService);
  protected query = signal('');
  protected categoryFilter = signal('all');

  protected categories = computed(() => this.store.categories());

  protected filtered = computed(() => {
    const q = this.query().toLowerCase();
    const cat = this.categoryFilter();
    return this.store.products().filter((p) => {
      if (cat !== 'all' && p.categoryId !== cat) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected categoryName(id: string): string {
    return this.store.categories().find((c) => c.id === id)?.name ?? id;
  }

  protected deleteProduct(id: string, name: string): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.store.deleteProduct(id);
  }
}
