import { Component, computed, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonContent } from '@ionic/angular';
import { PRODUCTS } from '../../data/mock-data';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

const POPULAR = ['bridal lehenga', 'red saree', 'party wear', 'gown under 25000'];

@Component({
  selector: 'app-search',
  templateUrl: 'search.page.html',
  styleUrls: ['search.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonContent, ProductCardComponent],
})
export class SearchPage {
  protected query = signal('');
  protected popular = POPULAR;

  protected results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q),
    );
  });

  setQuery(q: string): void {
    this.query.set(q);
  }
}
