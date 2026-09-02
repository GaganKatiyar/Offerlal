import { Component, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonSearchbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';
import { CATEGORIES, PRODUCTS } from '../../../data/mock-data';
import { ProductCardComponent } from '../../../components/product-card/product-card.component';

@Component({
  selector: 'app-tab-home',
  templateUrl: 'tab-home.page.html',
  styleUrls: ['tab-home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonContent, IonIcon, IonSearchbar, ProductCardComponent],
})
export class TabHomePage {
  protected categories = CATEGORIES;
  protected newArrivals = computed(() => PRODUCTS.filter((p) => p.isNewArrival || true).slice(0, 4));
  protected bestsellers = computed(() => PRODUCTS.filter((p) => p.isBestseller));

  constructor(private router: Router) {
    addIcons({ notificationsOutline });
  }

  openCategory(categoryId: string): void {
    this.router.navigate(['/tabs/shop'], { queryParams: { categoryId } });
  }
}
