import { Component, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular';
import { CATEGORIES, PRODUCTS } from '../../../data/mock-data';
import { ProductCardComponent } from '../../../components/product-card/product-card.component';

@Component({
  selector: 'app-tab-shop',
  templateUrl: 'tab-shop.page.html',
  styleUrls: ['tab-shop.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ProductCardComponent],
})
export class TabShopPage {
  protected categories = CATEGORIES;
  protected activeCategory = signal<string | null>(null);

  protected products = computed(() => {
    const active = this.activeCategory();
    return active ? PRODUCTS.filter((p) => p.categoryId === active) : PRODUCTS;
  });

  constructor(route: ActivatedRoute) {
    route.queryParams.subscribe((params) => {
      this.activeCategory.set(params['categoryId'] ?? null);
    });
  }

  select(categoryId: string | null): void {
    this.activeCategory.set(categoryId);
  }
}
