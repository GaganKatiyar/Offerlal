import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { CatalogQuery, Facet, ProductCardModel, ProductSearchResult } from '../../../core/models/catalog-search.model';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { PlpQueryService } from '../../../core/services/plp-query.service';
import { DensityService } from '../../../core/services/density.service';
import { ProductCard } from '../product-card/product-card';
import { ProductCardSkeleton, StateBlock } from '../../ui/state';
import { Drawer } from '../../ui/drawer/drawer';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
];

/** An applied filter, rendered as a removable chip above the grid. */
export interface AppliedFilter {
  code: string;
  value?: string;
  label: string;
}

/**
 * Filter rail + product grid, driven entirely by the server.
 *
 * Previously this took the whole product array as an input and recomputed
 * filtering, faceting and counting in computed() signals on every toggle. That
 * required the entire catalogue in the browser, and its facet counts were
 * wrong across pagination because they only ever saw the loaded page.
 *
 * Two things follow from the server owning the query:
 *
 * 1. The facet rail is now a generic loop over whatever facets the API returns,
 *    not hardcoded Colour/Size/Fabric sections. A catalogue spanning apparel,
 *    jewellery and footwear cannot share one fixed filter list — the four size
 *    schemes alone make that unworkable — and a new attribute now needs no
 *    frontend change at all.
 *
 * 2. Filter state lives in the URL via PlpQueryService, so a filtered view is
 *    shareable and the back button undoes one filter.
 */
@Component({
  selector: 'app-product-browser',
  standalone: true,
  imports: [NgTemplateOutlet, ProductCard, Drawer, ProductCardSkeleton, StateBlock],
  templateUrl: './product-browser.html',
  styleUrl: './product-browser.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBrowser {
  /** Route context. Unlike the filters, these are not user-clearable. */
  categoryId = input<string | undefined>(undefined);
  occasionId = input<string | undefined>(undefined);

  /**
   * Route-level filters for /new-arrivals and /sale. Like the category, these
   * define WHICH catalogue the shopper is browsing rather than a choice they
   * made, so "Clear all" must not remove them.
   */
  newArrivals = input(false);
  onSale = input(false);

  private api = inject(CatalogApiService);
  protected plpQuery = inject(PlpQueryService);
  protected density = inject(DensityService);

  protected sortOptions = SORT_OPTIONS;
  protected densityOptions = this.density.options;
  protected mobileFiltersOpen = signal(false);

  /** Which facet groups are collapsed. Long rails are unusable fully expanded. */
  private collapsed = signal<ReadonlySet<string>>(new Set());

  protected readonly request = computed<CatalogQuery>(() => ({
    ...this.plpQuery.query(),
    categoryId: this.categoryId(),
    occasionId: this.occasionId(),
    newArrivals: this.newArrivals() || undefined,
    onSale: this.onSale() || undefined,
  }));

  private readonly resource = rxResource({
    params: () => this.request(),
    stream: ({ params }) => this.api.search(params),
  });

  protected loading = computed(() => this.resource.isLoading());


  /**
   * Re-runs the failed request.
   *
   * The error state previously told the shopper to "try again" while offering
   * nothing to try again with, so the only way out of a failed listing was a
   * full page reload.
   */
  protected retry(): void {
    this.resource.reload();
  }

  /** First load: nothing on screen yet, so show placeholders rather than a gap. */
  protected showSkeletons = computed(() => this.loading() && this.items().length === 0);
  protected error = computed(() => this.resource.error());

  /**
   * The resource's value, or undefined when it has none.
   *
   * `resource.value()` THROWS once the resource is in an error state — it is a
   * throwing accessor, not a nullable one. Reading it unguarded inside the
   * linkedSignal below meant that the first failed request threw during change
   * detection, which stopped the view updating at all: the error state could
   * never render because rendering it was what crashed. The screen simply froze
   * on whatever it had last drawn, reporting `loading` forever.
   *
   * hasValue() is the guard the API provides for exactly this.
   */
  private readonly safeValue = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  protected result = computed(() => this.safeValue());

  /**
   * Hybrid paging: pages accumulate as the shopper loads more, but the page
   * number stays in the URL. Pure infinite scroll destroys back navigation and
   * is invisible to crawlers; pure pagination feels wrong on a phone.
   *
   * A linkedSignal rather than a computed, because accumulation needs the
   * PREVIOUS value and a computed may not write signals — doing so silently
   * breaks the whole component, which is exactly what happened on the first
   * attempt here. `previous` is the supported way to carry state forward.
   *
   * The key covers every part of the query except the page, so changing a
   * filter resets the list while turning the page appends to it.
   */
  protected items = linkedSignal<
    { result: ProductSearchResult | undefined; key: string },
    ProductCardModel[]
  >({
    // The source is ALWAYS defined, even mid-fetch.
    //
    // Returning undefined while the resource reloads breaks the accumulation
    // lineage: `previous.source` becomes that undefined, the key comparison on
    // the next emission fails, and page 2 replaces page 1 instead of appending
    // to it. Carrying the key through the loading state is what keeps
    // "Load more" working.
    source: () => ({ result: this.safeValue(), key: filterKey(this.request()) }),

    computation: (source, previous) => {
      const previousItems = previous?.value ?? [];

      // Mid-fetch: keep the current results on screen (dimmed by .is-loading)
      // rather than blanking the grid and losing the scroll position.
      if (!source.result) return previousItems;

      // Page 1 always replaces — this is also the path taken whenever a filter
      // changes, because any non-paging change resets the page.
      if (previous?.source?.key !== source.key || source.result.page <= 1) {
        return source.result.items;
      }

      const seen = new Set(previousItems.map((i) => i.id));
      return [...previousItems, ...source.result.items.filter((i) => !seen.has(i.id))];
    },
  });

  protected facets = computed<Facet[]>(() => this.result()?.facets ?? []);
  protected totalCount = computed(() => this.result()?.totalCount ?? 0);
  protected hasNext = computed(() => this.result()?.hasNext ?? false);
  protected priceBounds = computed(() => this.result()?.priceBounds ?? { min: 0, max: 0 });

  protected sort = computed(() => this.plpQuery.query().sort ?? 'recommended');
  protected inStockOnly = computed(() => this.plpQuery.query().inStock === true);
  protected customSizingOnly = computed(() => this.plpQuery.query().customSizing === true);

  protected effectivePriceMin = computed(() => this.plpQuery.query().priceMin ?? this.priceBounds().min);
  protected effectivePriceMax = computed(() => this.plpQuery.query().priceMax ?? this.priceBounds().max);

  protected rangeFillStyle = computed(() => {
    const { min, max } = this.priceBounds();
    const span = max - min;
    if (span <= 0) return { left: 0, width: 100 };
    return {
      left: ((this.effectivePriceMin() - min) / span) * 100,
      width: ((this.effectivePriceMax() - this.effectivePriceMin()) / span) * 100,
    };
  });

  /**
   * Applied filters as chips. Labels come from the facet options so the chip
   * reads "Raw Silk" rather than the "raw-silk" slug that is in the URL.
   */
  protected appliedFilters = computed<AppliedFilter[]>(() => {
    const q = this.plpQuery.query();
    const chips: AppliedFilter[] = [];

    for (const [code, values] of Object.entries(q.facets ?? {})) {
      const facet = this.facets().find((f) => f.code === code);
      for (const value of values) {
        chips.push({
          code,
          value,
          label: facet?.options.find((o) => o.value === value)?.label ?? value,
        });
      }
    }

    if (q.priceMin != null || q.priceMax != null) {
      chips.push({
        code: 'price',
        label: `₹${this.effectivePriceMin().toLocaleString('en-IN')} – ₹${this.effectivePriceMax().toLocaleString('en-IN')}`,
      });
    }
    if (q.inStock) chips.push({ code: 'inStock', label: 'In stock' });
    if (q.customSizing) chips.push({ code: 'customSizing', label: 'Custom sizing' });
    if (q.minRating != null) chips.push({ code: 'minRating', label: `${q.minRating}★ & above` });

    return chips;
  });

  protected isSelected(code: string, value: string): boolean {
    return (this.plpQuery.query().facets?.[code] ?? []).includes(value);
  }

  protected isCollapsed(code: string): boolean {
    return this.collapsed().has(code);
  }

  protected toggleGroup(code: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  protected toggleFacet(code: string, value: string): void {
    this.plpQuery.toggleFacet(code, value);
  }

  protected removeChip(chip: AppliedFilter): void {
    switch (chip.code) {
      case 'price':
        this.plpQuery.patch({ priceMin: undefined, priceMax: undefined });
        break;
      case 'inStock':
        this.plpQuery.patch({ inStock: undefined });
        break;
      case 'customSizing':
        this.plpQuery.patch({ customSizing: undefined });
        break;
      case 'minRating':
        this.plpQuery.patch({ minRating: undefined });
        break;
      default:
        this.plpQuery.clearFacet(chip.code, chip.value);
    }
  }

  protected clearFilters(): void {
    this.plpQuery.clearAll();
  }

  protected setSort(value: string): void {
    this.plpQuery.patch({ sort: value });
  }

  protected toggleInStock(): void {
    this.plpQuery.patch({ inStock: this.inStockOnly() ? undefined : true });
  }

  protected toggleCustomSizing(): void {
    this.plpQuery.patch({ customSizing: this.customSizingOnly() ? undefined : true });
  }

  protected onMinRangeInput(value: number): void {
    this.plpQuery.patch({ priceMin: Math.min(value, this.effectivePriceMax()) });
  }

  protected onMaxRangeInput(value: number): void {
    this.plpQuery.patch({ priceMax: Math.max(value, this.effectivePriceMin()) });
  }

  protected loadMore(): void {
    const current = this.plpQuery.query().page ?? 1;
    this.plpQuery.patch({ page: current + 1 }, { resetPage: false });
  }
}

/** Everything that invalidates accumulated results — i.e. everything but the page. */
function filterKey(q: CatalogQuery): string {
  const facets = Object.entries(q.facets ?? {})
    .map(([code, values]) => `${code}:${[...values].sort().join('|')}`)
    .sort()
    .join(';');

  return [q.categoryId, q.occasionId, q.newArrivals, q.onSale, q.q, q.sort, q.priceMin, q.priceMax, q.inStock, q.customSizing, q.minRating, facets].join('~');
}
