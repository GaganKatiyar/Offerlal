import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { ProductService } from '../../core/services/product.service';
import { ReviewService } from '../../core/services/review.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { Product, ProductVariant, Review, CartItemCustomization } from '../../core/models';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';
import { PriceDisplay } from '../../shared/components/price-display/price-display';
import { StarRating } from '../../shared/components/star-rating/star-rating';
import { Breadcrumb, Crumb } from '../../shared/components/breadcrumb/breadcrumb';
import { QuantityStepper } from '../../shared/components/quantity-stepper/quantity-stepper';
import { AccordionItem } from '../../shared/ui/accordion/accordion-item';
import { Modal } from '../../shared/ui/modal/modal';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { SizeChart } from '../../core/models/catalog-search.model';


@Component({
  selector: 'app-pdp',
  standalone: true,
  imports: [
    RouterLink,
    ImageWithFallback,
    PriceDisplay,
    StarRating,
    Breadcrumb,
    QuantityStepper,
    AccordionItem,
    Modal,
    ProductCard,
    InrCurrencyPipe,
  ],
  templateUrl: './pdp.html',
  styleUrl: './pdp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pdp implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private catalogApi = inject(CatalogApiService);
  private reviewService = inject(ReviewService);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);
  private toast = inject(ToastService);
  protected auth = inject(AuthService);
  private meta = inject(Meta);
  private title = inject(Title);

  protected product = signal<Product | undefined>(undefined);
  protected reviews = signal<Review[]>([]);
  protected related = signal<Product[]>([]);
  /**
   * The size chart for this product, or null when its size scheme has none.
   *
   * Previously a SIZE_CHART constant in this file: one apparel chart of
   * bust/waist/hip shown on every product, including chokers and shoes. It is
   * now data keyed on the product's size scheme, so a category without a chart
   * simply shows no size guide — no special-casing here.
   */
  protected sizeChart = signal<SizeChart | null>(null);

  protected hasSizeChart = computed(() => (this.sizeChart()?.rows.length ?? 0) > 0);

  protected selectedVariant = signal<ProductVariant | undefined>(undefined);
  protected selectedImageIndex = signal(0);
  protected zoomOpen = signal(false);
  protected selectedSize = signal<string | undefined>(undefined);
  protected sizePreselectedFromProfile = signal(false);
  protected quantity = signal(1);
  protected selectedCustomizations = signal<string[]>([]);
  protected sizeChartOpen = signal(false);

  /** Opens the lightbox at a specific image — zoom is now secondary to the grid. */
  protected openZoom(index: number): void {
    this.selectedImageIndex.set(index);
    this.zoomOpen.set(true);
  }
  protected notFound = signal(false);

  protected inWishlist = computed(() => {
    const p = this.product();
    return p ? this.wishlist.has(p.id) : false;
  });

  protected breadcrumbs = computed<Crumb[]>(() => {
    const p = this.product();
    if (!p) return [{ label: 'Home', link: '/' }];
    return [
      { label: 'Home', link: '/' },
      {
        label: p.categoryId.replace('cat-', '').replace(/-/g, ' '),
        link: '/category/' + p.categoryId.replace('cat-', ''),
      },
      { label: p.name },
    ];
  });

  protected currentImages = computed(() => this.selectedVariant()?.images ?? []);

  protected nextZoomImage(): void {
    const total = this.currentImages().length;
    if (total) this.selectedImageIndex.update((i) => (i + 1) % total);
  }

  protected prevZoomImage(): void {
    const total = this.currentImages().length;
    if (total) this.selectedImageIndex.update((i) => (i - 1 + total) % total);
  }

  protected currentStock = computed(() => {
    const variant = this.selectedVariant();
    const size = this.selectedSize();
    if (!variant || !size) return 0;
    return variant.skus.find((s) => s.size === size)?.stock ?? 0;
  });

  protected customizationTotal = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return p.customizationOptions
      .filter((o) => this.selectedCustomizations().includes(o.id))
      .reduce((sum, o) => sum + o.priceDelta, 0);
  });

  protected unitPrice = computed(() => (this.product()?.price ?? 0) + this.customizationTotal());

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.productService.getBySlug(slug).subscribe((p) => {
        if (!p) {
          this.notFound.set(true);
          return;
        }
        this.product.set(p);
        this.selectedVariant.set(p.variants[0]);
        this.selectedImageIndex.set(0);

        // Size preselection, in priority order:
        //   1. ?size= from the link that got here (wishlist card size chips),
        //      because an explicit choice this click beats a stored preference.
        //   2. The customer's saved size profile, when it applies here.
        const requestedSize = this.route.snapshot.queryParamMap.get('size');
        const requestedApplies = !!requestedSize && p.sizes.includes(requestedSize);

        const savedSize = this.auth.currentUser()?.sizeProfile?.preferredSize;
        const savedSizeApplies = !!savedSize && p.sizes.includes(savedSize);

        if (requestedApplies) {
          this.selectedSize.set(requestedSize!);
          this.sizePreselectedFromProfile.set(false);
        } else {
          this.selectedSize.set(savedSizeApplies ? savedSize : undefined);
          this.sizePreselectedFromProfile.set(savedSizeApplies);
        }

        this.quantity.set(1);
        this.selectedCustomizations.set([]);
        this.setSeo(p);
        this.sizeChart.set(null);
        this.catalogApi.getSizeChart(p.id).subscribe({
          next: (chart) => this.sizeChart.set(chart),
          // A missing chart must never break the page; it just means no guide.
          error: () => this.sizeChart.set(null),
        });
        this.reviewService.getByProduct(p.id).subscribe((r) => this.reviews.set(r));
        this.productService.getRelated(p.id, 4).subscribe((r) => this.related.set(r));
      });
    });
  }

  private setSeo(p: Product): void {
    this.title.setTitle(p.seo.metaTitle);
    this.meta.updateTag({ name: 'description', content: p.seo.metaDescription });
    this.meta.updateTag({ property: 'og:title', content: p.seo.metaTitle });
    this.meta.updateTag({ property: 'og:description', content: p.seo.metaDescription });
    this.meta.updateTag({ property: 'og:image', content: p.variants[0]?.images[0]?.url ?? '' });
  }

  protected selectVariant(variant: ProductVariant): void {
    this.selectedVariant.set(variant);
    this.selectedImageIndex.set(0);
  }

  protected selectSize(size: string): void {
    this.selectedSize.set(size);
    this.sizePreselectedFromProfile.set(false);
  }

  protected toggleCustomization(id: string): void {
    this.selectedCustomizations.update((list) =>
      list.includes(id) ? list.filter((c) => c !== id) : [...list, id],
    );
  }

  private buildCustomizations(): CartItemCustomization[] {
    const p = this.product();
    if (!p) return [];
    return p.customizationOptions
      .filter((o) => this.selectedCustomizations().includes(o.id))
      .map((o) => ({ optionId: o.id, label: o.label, priceDelta: o.priceDelta }));
  }

  protected addToBag(): void {
    const p = this.product();
    const variant = this.selectedVariant();
    if (!p || !variant) return;
    if (!this.selectedSize()) {
      this.toast.show('Please select a size');
      return;
    }
    this.cart.add(p, variant, this.selectedSize()!, this.quantity(), this.buildCustomizations());
    this.toast.show(`${p.name} added to your bag`);
    this.cart.openDrawer();
  }

  protected buyNow(): void {
    const p = this.product();
    const variant = this.selectedVariant();
    if (!p || !variant) return;
    if (!this.selectedSize()) {
      this.toast.show('Please select a size');
      return;
    }
    this.cart.add(p, variant, this.selectedSize()!, this.quantity(), this.buildCustomizations());
    this.router.navigate(['/checkout']);
  }

  protected toggleWishlist(): void {
    const p = this.product();
    if (p) this.wishlist.toggle(p.id);
  }

  protected whatsappHref(): string {
    const p = this.product();
    if (!p) return '#';
    const text = `Hi, I'm interested in ${p.name} - SKU ${p.sku}, priced at ₹${p.price.toLocaleString('en-IN')}. ${typeof window !== 'undefined' ? window.location.href : ''}`;
    return `https://wa.me/917390965819?text=${encodeURIComponent(text)}`;
  }

  // Derived strictly from this product's actual review records — not the
  // product's cached rating/reviewCount fields, which can be seeded ahead of
  // real review content and would otherwise show a rating with nothing behind it.
  protected reviewCount = computed(() => this.reviews().length);
  protected averageRating = computed(() => {
    const list = this.reviews();
    if (!list.length) return 0;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  });

  protected ratingCounts = computed(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    this.reviews().forEach((r) => {
      const bucket = Math.round(r.rating);
      if (counts[bucket] != null) counts[bucket]++;
    });
    return counts;
  });
}
