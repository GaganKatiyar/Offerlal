import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heart, heartOutline, star, checkmarkCircle } from 'ionicons/icons';
import { PRODUCTS, MobileProduct } from '../../data/mock-data';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: 'product-detail.page.html',
  styleUrls: ['product-detail.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonIcon, IonContent, ProductCardComponent],
})
export class ProductDetailPage {
  protected product = signal<MobileProduct | undefined>(undefined);
  protected activeImage = signal(0);
  protected selectedSize = signal<string | null>(null);
  protected added = signal(false);

  protected related = computed(() => {
    const p = this.product();
    if (!p) return [];
    return PRODUCTS.filter((x) => x.id !== p.id && x.categoryId === p.categoryId).slice(0, 4);
  });

  protected inWishlist = computed(() => {
    const p = this.product();
    return p ? this.wishlist.has(p.id) : false;
  });

  protected discountPct = computed(() => {
    const p = this.product();
    if (!p?.compareAtPrice) return null;
    return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
  });

  constructor(
    route: ActivatedRoute,
    private router: Router,
    protected cart: CartService,
    protected wishlist: WishlistService,
  ) {
    addIcons({ heart, heartOutline, star, checkmarkCircle });
    const slug = route.snapshot.paramMap.get('slug');
    this.product.set(PRODUCTS.find((p) => p.slug === slug));
  }

  selectSize(size: string): void {
    this.selectedSize.set(size);
  }

  addToBag(): void {
    const p = this.product();
    const size = this.selectedSize();
    if (!p || !size) return;
    this.cart.add(p, size);
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1600);
  }

  toggleWishlist(): void {
    const p = this.product();
    if (p) this.wishlist.toggle(p.id);
  }

  openRelated(slug: string): void {
    this.router.navigate(['/product', slug]);
  }
}
