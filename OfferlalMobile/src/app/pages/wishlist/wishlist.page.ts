import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartDislikeOutline } from 'ionicons/icons';
import { PRODUCTS } from '../../data/mock-data';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  templateUrl: 'wishlist.page.html',
  styleUrls: ['wishlist.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon, ProductCardComponent],
})
export class WishlistPage {
  protected items = computed(() => PRODUCTS.filter((p) => this.wishlist.has(p.id)));

  constructor(protected wishlist: WishlistService) {
    addIcons({ heartDislikeOutline });
  }
}
