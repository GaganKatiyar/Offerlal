import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { CategoryService } from '../../core/services/category.service';
import { Category, Occasion } from '../../core/models';
import { Breadcrumb, Crumb } from '../../shared/components/breadcrumb/breadcrumb';
import { ProductBrowser } from '../../shared/components/product-browser/product-browser';

type Mode = 'category' | 'occasion' | 'new-arrivals' | 'sale' | 'all';

@Component({
  selector: 'app-plp',
  standalone: true,
  imports: [Breadcrumb, ProductBrowser],
  templateUrl: './plp.html',
  styleUrl: './plp.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plp implements OnInit {
  private route = inject(ActivatedRoute);
  private categoryService = inject(CategoryService);

  protected categories = signal<Category[]>([]);
  protected occasions = signal<Occasion[]>([]);
  protected currentCategory = signal<Category | undefined>(undefined);
  protected currentOccasion = signal<Occasion | undefined>(undefined);
  protected pageTitle = signal('Shop All');

  protected mode: Mode = 'all';

  /**
   * Whether the route context (category / occasion) has been resolved.
   *
   * The category and occasion lists load asynchronously, so on a category page
   * `currentCategory()` is briefly undefined. Rendering the browser during that
   * window made it fire an UNFILTERED catalogue request that was thrown away a
   * moment later when the id arrived — two requests per category page view, the
   * first one always wasted. Gating the browser on this signal means it issues
   * exactly one.
   */
  protected contextReady = signal(false);

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as Mode) ?? 'all';

    combineLatest([this.categoryService.getAll(), this.categoryService.getOccasions()]).subscribe(([cats, occs]) => {
      this.categories.set(cats);
      this.occasions.set(occs);
      this.route.paramMap.subscribe((params) => {
        this.contextReady.set(false);
        this.loadBase(params.get('slug'));
        this.contextReady.set(true);
      });
    });
  }

  /**
   * Resolves the route context and the page title only.
   *
   * It no longer fetches products. Every branch used to pull the whole demo
   * catalogue and filter it in the browser to feed ProductBrowser's `products`
   * input; the browser now queries the API itself, so that work fed nothing and
   * ran on every PLP view.
   */
  private loadBase(slug: string | null): void {
    this.currentCategory.set(undefined);
    this.currentOccasion.set(undefined);

    if (this.mode === 'category' && slug) {
      const cat = this.categories().find((c) => c.slug === slug);
      this.currentCategory.set(cat);
      this.pageTitle.set(cat?.name ?? 'Shop');
    } else if (this.mode === 'occasion' && slug) {
      const occ = this.occasions().find((o) => o.slug === slug);
      this.currentOccasion.set(occ);
      this.pageTitle.set(occ?.name ?? 'Shop by Occasion');
    } else if (this.mode === 'new-arrivals') {
      this.pageTitle.set('New Arrivals');
    } else if (this.mode === 'sale') {
      this.pageTitle.set('Sale');
    } else {
      this.pageTitle.set('Shop All');
    }
  }

  protected breadcrumbs = computed<Crumb[]>(() => [{ label: 'Home', link: '/' }, { label: this.pageTitle() }]);
}
