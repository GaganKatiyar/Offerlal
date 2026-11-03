import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models';
import { ProductCardModel } from '../../../core/models/catalog-search.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { QuickViewService } from '../../../core/services/quick-view.service';
import { ImageWithFallback } from '../image-with-fallback/image-with-fallback';
import { PriceDisplay } from '../price-display/price-display';
import { Badge } from '../badge/badge';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';

/**
 * How the card is being used. The card renders on home rails, the PLP, search,
 * the wishlist and PDP "related" — a single `variant` input keeps those as one
 * component instead of five near-identical forks.
 */
export type ProductCardVariant = 'grid' | 'rail' | 'wishlist' | 'compact';

/** Sizes offered only as made-to-measure rather than off-the-rack. */
const CUSTOM_SIZE = 'Custom';

/**
 * Below this, a savings line is noise rather than persuasion. Chosen against
 * this catalogue, where the cheapest item is about 1,650 and the dearest
 * 1,65,000.
 */
const MIN_SAVINGS_TO_SHOW = 500;

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, ImageWithFallback, PriceDisplay, Badge, InrCurrencyPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"card-host card-host--" + variant()',
  },
})
export class ProductCard {
  /**
   * The card's own view model, from the server's faceted search endpoint.
   *
   * Preferred over `product`. There is deliberately ONE card component rather
   * than a second "lite" one: this card renders on the PLP, search, home rails,
   * the wishlist and PDP-related, and forking it by data source would mean
   * every future change to the card has to be made twice.
   */
  card = input<ProductCardModel | undefined>(undefined);

  /**
   * DEPRECATED — the full demo-data Product. Kept while home, wishlist, PDP and
   * the bridal edit still read from the in-memory store; those migrate to the
   * API in later phases, after which this input and the adapter below go.
   */
  product = input<Product | undefined>(undefined);

  variant = input<ProductCardVariant>('grid');

  /** Wishlist view swaps the heart for a remove control and shows size chips. */
  removable = input(false);

  quickView = output<ProductCardModel>();
  remove = output<ProductCardModel>();

  private wishlist = inject(WishlistService);
  private quickViewService = inject(QuickViewService);

  /** Normalises whichever input was supplied into one shape. */
  protected vm = computed<ProductCardModel>(() => {
    const card = this.card();
    if (card) return card;

    const p = this.product();
    if (!p) throw new Error('app-product-card requires either [card] or [product].');

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryId: p.categoryId,
      subCategory: p.subCategory,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      rating: p.rating,
      reviewCount: p.reviewCount,
      stockStatus: p.stockStatus,
      isBestseller: p.isBestseller,
      isNewArrival: p.isNewArrival,
      fabric: p.fabric,
      hasCustomSizing: p.sizes.includes(CUSTOM_SIZE),
      thumbnailUrl: p.variants[0]?.images[0]?.url,
      thumbnailAlt: p.variants[0]?.images[0]?.alt,
      thumbnailWidths: [],
      swatches: p.variants.map((v) => ({ color: v.color, colorHex: v.colorHex })),
    };
  });

  protected primaryImage = computed(() => this.vm().thumbnailUrl ?? '');

  /**
   * Prefers the library's description of the picture over the product name.
   * Falling back to the name made screen readers announce the title twice and
   * said nothing about what the photo showed.
   */
  protected imageAlt = computed(() => this.vm().thumbnailAlt?.trim() || this.vm().name);

  protected imageWidths = computed(() => this.vm().thumbnailWidths ?? []);
  protected inWishlist = computed(() => this.wishlist.has(this.vm().id));

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
    const vm = this.vm();
    return vm.subCategory?.trim() || vm.fabric?.trim() || 'Offerlal';
  });

  /**
   * Off-the-rack sizes only. "Custom" is excluded because it is not a size a
   * shopper picks off a card — it opens a made-to-measure conversation.
   */
  protected stockSizes = computed(() => (this.product()?.sizes ?? []).filter((s) => s !== CUSTOM_SIZE));

  protected isMadeToMeasure = computed(() => this.vm().hasCustomSizing);

  /**
   * The discount, derived rather than carried on the model.
   *
   * Deliberately NOT a field on ProductCardModel. Price and compareAtPrice are
   * already here, so a stored percentage would be a second copy of the same
   * fact and the two would eventually disagree — the card saying 20% OFF beside
   * a price row computing 16%.
   */
  protected discountPercent = computed(() => {
    const { price, compareAtPrice } = this.vm();
    if (!compareAtPrice || compareAtPrice <= price) return null;
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  });

  /**
   * Money kept, in rupees.
   *
   * compareAtPrice minus price, and nothing else. GST is INCLUDED in the
   * displayed price here, so any saving computed from tax would be inventing a
   * discount the customer is not getting.
   *
   * Hidden below a floor: "You save ₹40" under a ₹1,650 bag is noise, and at
   * this catalogue's prices a saving worth announcing is a large one.
   */
  protected savings = computed(() => {
    const { price, compareAtPrice } = this.vm();
    if (!compareAtPrice || compareAtPrice <= price) return null;
    const diff = compareAtPrice - price;
    return diff >= MIN_SAVINGS_TO_SHOW ? diff : null;
  });

  protected showSizeChips = computed(
    () => this.variant() === 'wishlist' && this.stockSizes().length > 0,
  );

  /** Distinct swatches, capped — a 9-colour product should not blow out the row. */
  protected swatches = computed(() => this.vm().swatches.slice(0, 5));
  protected extraSwatchCount = computed(() => Math.max(0, this.vm().swatches.length - 5));

  protected toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlist.toggle(this.vm().id);
  }

  protected removeItem(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.remove.emit(this.vm());
  }

  protected openQuickView(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const p = this.product();
    // Quick view needs the full product (variants, customisations), which the
    // slim card model does not carry. Suppressed until the modal reads by id.
    if (p) this.quickViewService.open(p);
    this.quickView.emit(this.vm());
  }
}
