import { Component, computed, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heart, heartOutline } from 'ionicons/icons';
import { MobileProduct } from '../../data/mock-data';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  product = input.required<MobileProduct>();

  protected inWishlist = computed(() => this.wishlist.has(this.product().id));
  protected discountPct = computed(() => {
    const p = this.product();
    if (!p.compareAtPrice) return null;
    return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
  });

  constructor(
    private router: Router,
    protected wishlist: WishlistService,
  ) {
    addIcons({ heart, heartOutline });
  }

  open(): void {
    this.router.navigate(['/product', this.product().slug]);
  }

  toggleWishlist(event: Event): void {
    event.stopPropagation();
    this.wishlist.toggle(this.product().id);
  }
}
