import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Product, ProductFilters, ProductSortOption } from '../../../core/models';
import { ProductCard } from '../product-card/product-card';
import { Drawer } from '../../ui/drawer/drawer';
import { DensityService } from '../../../core/services/density.service';

const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
];

/**
 * Left filter panel (price slider, color swatches, size/fabric checkboxes with
 * counts) + right product grid, reused by the PLP page and the homepage's
 * "Shop All" section so both stay in sync with one implementation.
 */
@Component({
  selector: 'app-product-browser',
  standalone: true,
  imports: [NgTemplateOutlet, ProductCard, Drawer],
  templateUrl: './product-browser.html',
  styleUrl: './product-browser.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBrowser {
  products = input.required<Product[]>();
  /** Optional starting price range (e.g. from a "Shop by Budget" tile's query params). */
  initialPriceMin = input<number | null>(null);
  initialPriceMax = input<number | null>(null);

  protected sortOptions = SORT_OPTIONS;

  protected density = inject(DensityService);
  protected densityOptions = this.density.options;

  protected sort = signal<ProductSortOption>('recommended');
  // linkedSignal, not an effect writing to a signal.
  //
  // The previous effect() re-ran on ANY signal it read, so every change to the
  // inputs stamped over whatever price range the shopper had dragged to. As a
  // linkedSignal the value resets only when the source input actually changes
  // (navigating to a different budget tile), and a user drag survives
  // unrelated re-renders.
  protected priceMin = linkedSignal<number | null, number | null>({
    source: this.initialPriceMin,
    computation: (source) => source,
  });
  protected priceMax = linkedSignal<number | null, number | null>({
    source: this.initialPriceMax,
    computation: (source) => source,
  });
  protected selectedColors = signal<string[]>([]);
  protected selectedSizes = signal<string[]>([]);
  protected selectedFabrics = signal<string[]>([]);
  protected inStockOnly = signal(false);
  protected minRating = signal<number | null>(null);
  protected mobileFiltersOpen = signal(false);

  protected availableColors = computed(() => {
    const set = new Set<string>();
    this.products().forEach((p) => p.variants.forEach((v) => set.add(v.color)));
    return Array.from(set).sort();
  });

  protected colorHexByName = computed(() => {
    const map = new Map<string, string>();
    this.products().forEach((p) => p.variants.forEach((v) => map.set(v.color, v.colorHex)));
    return map;
  });

  protected availableSizes = computed(() => {
    const set = new Set<string>();
    this.products().forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return Array.from(set);
  });

  protected availableFabrics = computed(() => {
    const set = new Set<string>();
    this.products().forEach((p) => set.add(p.fabric));
    return Array.from(set).sort();
  });

  protected priceBounds = computed(() => {
    const prices = this.products().map((p) => p.price);
    if (!prices.length) return { min: 0, max: 200000 };
    return {
      min: Math.floor(Math.min(...prices) / 100) * 100,
      max: Math.ceil(Math.max(...prices) / 100) * 100,
    };
  });

  protected colorCounts = computed(() => {
    const counts = new Map<string, number>();
    this.products().forEach((p) => {
      const colorsInProduct = new Set(p.variants.map((v) => v.color));
      colorsInProduct.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    });
    return counts;
  });

  protected sizeCounts = computed(() => {
    const counts = new Map<string, number>();
    this.products().forEach((p) =>
      new Set(p.sizes).forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)),
    );
    return counts;
  });

  protected fabricCounts = computed(() => {
    const counts = new Map<string, number>();
    this.products().forEach((p) => counts.set(p.fabric, (counts.get(p.fabric) ?? 0) + 1));
    return counts;
  });

  protected filtered = computed(() => {
    const filters: ProductFilters = {
      priceMin: this.priceMin() ?? undefined,
      priceMax: this.priceMax() ?? undefined,
      colors: this.selectedColors().length ? this.selectedColors() : undefined,
      sizes: this.selectedSizes().length ? this.selectedSizes() : undefined,
      fabrics: this.selectedFabrics().length ? this.selectedFabrics() : undefined,
      inStockOnly: this.inStockOnly() || undefined,
      minRating: this.minRating() ?? undefined,
    };
    let list = this.products();
    if (filters.priceMin != null) list = list.filter((p) => p.price >= filters.priceMin!);
    if (filters.priceMax != null) list = list.filter((p) => p.price <= filters.priceMax!);
    if (filters.colors)
      list = list.filter((p) => p.variants.some((v) => filters.colors!.includes(v.color)));
    if (filters.sizes) list = list.filter((p) => p.sizes.some((s) => filters.sizes!.includes(s)));
    if (filters.fabrics) list = list.filter((p) => filters.fabrics!.includes(p.fabric));
    if (filters.inStockOnly) list = list.filter((p) => p.stockStatus !== 'out-of-stock');
    if (filters.minRating != null) list = list.filter((p) => p.rating >= filters.minRating!);

    const sorted = [...list];
    switch (this.sort()) {
      case 'newest':
        sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case 'bestselling':
        sorted.sort(
          (a, b) =>
            Number(b.isBestseller) - Number(a.isBestseller) || b.reviewCount - a.reviewCount,
        );
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      default:
        sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.rating - a.rating);
    }
    return sorted;
  });

  protected toggleColor(color: string): void {
    this.selectedColors.update((list) =>
      list.includes(color) ? list.filter((c) => c !== color) : [...list, color],
    );
  }

  protected toggleSize(size: string): void {
    this.selectedSizes.update((list) =>
      list.includes(size) ? list.filter((s) => s !== size) : [...list, size],
    );
  }

  protected toggleFabric(fabric: string): void {
    this.selectedFabrics.update((list) =>
      list.includes(fabric) ? list.filter((f) => f !== fabric) : [...list, fabric],
    );
  }

  protected rangeFillStyle = computed(() => {
    const { min, max } = this.priceBounds();
    const span = max - min || 1;
    const lo = this.priceMin() ?? min;
    const hi = this.priceMax() ?? max;
    return { left: ((lo - min) / span) * 100, width: Math.max(0, ((hi - lo) / span) * 100) };
  });

  protected effectivePriceMin(): number {
    return this.priceMin() ?? this.priceBounds().min;
  }

  protected effectivePriceMax(): number {
    return this.priceMax() ?? this.priceBounds().max;
  }

  protected onMinRangeInput(value: number): void {
    this.priceMin.set(Math.min(value, this.effectivePriceMax()));
  }

  protected onMaxRangeInput(value: number): void {
    this.priceMax.set(Math.max(value, this.effectivePriceMin()));
  }

  protected clearFilters(): void {
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.selectedColors.set([]);
    this.selectedSizes.set([]);
    this.selectedFabrics.set([]);
    this.inStockOnly.set(false);
    this.minRating.set(null);
  }
}
