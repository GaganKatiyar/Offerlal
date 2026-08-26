import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { QuickViewService } from '../../../core/services/quick-view.service';
import { ToastService } from '../toast/toast.service';
import { ImageWithFallback } from '../image-with-fallback/image-with-fallback';
import { PriceDisplay } from '../price-display/price-display';
import { StarRating } from '../star-rating/star-rating';
import { Badge } from '../badge/badge';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, PriceDisplay, StarRating, Badge],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  product = input.required<Product>();
  quickView = output<Product>();

  private cart = inject(CartService);
  private wishlist = inject(WishlistService);
  private toast = inject(ToastService);
  private quickViewService = inject(QuickViewService);

  protected primaryImage = computed(() => this.product().variants[0]?.images[0]?.url ?? '');
  protected inWishlist = computed(() => this.wishlist.has(this.product().id));

  protected toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlist.toggle(this.product().id);
  }

  protected quickAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const p = this.product();
    const variant = p.variants[0];
    const size = p.sizes.find((s) => s !== 'Custom') ?? p.sizes[0];
    this.cart.add(p, variant, size, 1);
    this.toast.show(`${p.name} added to your bag`);
  }

  protected openQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickViewService.open(this.product());
    this.quickView.emit(this.product());
  }
}
