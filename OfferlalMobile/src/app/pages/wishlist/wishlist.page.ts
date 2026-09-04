import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartDislikeOutline } from 'ionicons/icons';
import { MobileProduct } from '../../data/mock-data';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { CatalogApiService } from '../../services/catalog-api.service';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  templateUrl: 'wishlist.page.html',
  styleUrls: ['wishlist.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon, ProductCardComponent],
})
export class WishlistPage {
  private catalog = inject(CatalogApiService);

  protected items = signal<MobileProduct[]>([]);
  protected loading = signal(false);

  constructor(protected wishlist: WishlistService) {
    addIcons({ heartDislikeOutline });

    // Re-resolve whenever the id set changes, including a removal made from
    // this very page — the products are no longer in the bundle, so the list
    // cannot just be a filter over a local array.
    effect(() => {
      const ids = [...this.wishlist.ids()];
      if (!ids.length) {
        this.items.set([]);
        return;
      }
      this.loading.set(true);
      this.catalog.productsByIds(ids).subscribe({
        next: (rows) => {
          this.items.set(rows);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
}
