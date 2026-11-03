import { Component, computed, inject, signal } from '@angular/core';
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
import { MobileProduct } from '../../data/mock-data';
import { CatalogApiService } from '../../services/catalog-api.service';
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

  protected related = signal<MobileProduct[]>([]);
  protected loading = signal(true);
  protected failed = signal(false);

  protected inWishlist = computed(() => {
    const p = this.product();
    return p ? this.wishlist.has(p.id) : false;
  });

  protected discountPct = computed(() => {
    const p = this.product();
    if (!p?.compareAtPrice) return null;
    return Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100);
  });

  private catalog = inject(CatalogApiService);

  constructor(
    route: ActivatedRoute,
    private router: Router,
    protected cart: CartService,
    protected wishlist: WishlistService,
  ) {
    addIcons({ heart, heartOutline, star, checkmarkCircle });

    // paramMap, not snapshot: tapping a related product navigates to this same
    // route, and Angular reuses the component rather than rebuilding it. With
    // the snapshot the page kept showing the product you came from.
    route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) this.load(slug);
    });
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.failed.set(false);
    this.selectedSize.set(null);
    this.activeImage.set(0);

    this.catalog.productBySlug(slug).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
        this.loadRelated(p);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadRelated(p: MobileProduct): void {
    this.catalog.products({ categoryId: p.categoryId, pageSize: 5 }).subscribe({
      next: (page) => this.related.set(page.items.filter((x) => x.id !== p.id).slice(0, 4)),
      error: () => this.related.set([]),
    });
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
