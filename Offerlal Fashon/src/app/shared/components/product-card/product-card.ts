import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models';
import { WishlistService } from '../../../core/services/wishlist.service';
import { QuickViewService } from '../../../core/services/quick-view.service';
import { ImageWithFallback } from '../image-with-fallback/image-with-fallback';
import { PriceDisplay } from '../price-display/price-display';
import { Badge } from '../badge/badge';

/**
 * How the card is being used. The card renders on home rails, the PLP, search,
 * the wishlist and PDP "related" — a single `variant` input keeps those as one
 * component instead of five near-identical forks.
 */
export type ProductCardVariant = 'grid' | 'rail' | 'wishlist' | 'compact';

/** Sizes offered only as made-to-measure rather than off-the-rack. */
const CUSTOM_SIZE = 'Custom';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, PriceDisplay, Badge],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"card-host card-host--" + variant()',
  },
})
export class ProductCard {
  product = input.required<Product>();
  variant = input<ProductCardVariant>('grid');

  /** Wishlist view swaps the heart for a remove control and shows size chips. */
  removable = input(false);

  quickView = output<Product>();
  remove = output<Product>();

  private wishlist = inject(WishlistService);
  private quickViewService = inject(QuickViewService);

  protected primaryImage = computed(() => this.product().variants[0]?.images[0]?.url ?? '');
  protected inWishlist = computed(() => this.wishlist.has(this.product().id));

  /**
   * The bold first line, adapted from Myntra's brand-then-name hierarchy.
   *
   * Myntra leads with the brand because that is what its shoppers decide on.
   * Offerlal is single-brand, so a brand line would be the same seven
   * characters on every card — dead weight in the densest part of the layout.
   * The equivalent orienting information here is what the garment *is*, which
   * is what `subCategory` already carries ("Anarkali", "Heavy Bridal").
   */
  protected descriptor = computed(() => {
    const p = this.product();
    return p.subCategory?.trim() || p.fabric?.trim() || 'Offerlal';
  });

  /**
   * Off-the-rack sizes only. "Custom" is excluded because it is not a size a
   * shopper picks off a card — it opens a made-to-measure conversation.
   */
  protected stockSizes = computed(() => this.product().sizes.filter((s) => s !== CUSTOM_SIZE));

  protected isMadeToMeasure = computed(() => this.product().sizes.includes(CUSTOM_SIZE));

  protected showSizeChips = computed(
    () => this.variant() === 'wishlist' && this.stockSizes().length > 0,
  );

  /** Distinct swatches, capped — a 9-colour product should not blow out the row. */
  protected swatches = computed(() => this.product().variants.slice(0, 5));
  protected extraSwatchCount = computed(() => Math.max(0, this.product().variants.length - 5));

  protected toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlist.toggle(this.product().id);
  }

  protected removeItem(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.remove.emit(this.product());
  }

  protected openQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickViewService.open(this.product());
    this.quickView.emit(this.product());
  }
}
