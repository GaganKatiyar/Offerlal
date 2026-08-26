import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { Product, Category, Occasion } from '../../core/models';
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
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  protected allProducts = signal<Product[]>([]);
  protected categories = signal<Category[]>([]);
  protected occasions = signal<Occasion[]>([]);
  protected currentCategory = signal<Category | undefined>(undefined);
  protected currentOccasion = signal<Occasion | undefined>(undefined);
  protected pageTitle = signal('Shop All');

  protected mode: Mode = 'all';

  protected queryPriceMin = signal<number | null>(null);
  protected queryPriceMax = signal<number | null>(null);

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as Mode) ?? 'all';

    combineLatest([this.categoryService.getAll(), this.categoryService.getOccasions()]).subscribe(([cats, occs]) => {
      this.categories.set(cats);
      this.occasions.set(occs);
      this.route.paramMap.subscribe((params) => this.loadBase(params.get('slug')));
    });

    this.route.queryParams.subscribe((qp: Params) => {
      this.queryPriceMin.set(qp['priceMin'] ? Number(qp['priceMin']) : null);
      this.queryPriceMax.set(qp['priceMax'] ? Number(qp['priceMax']) : null);
    });
  }

  private loadBase(slug: string | null): void {
    if (this.mode === 'category' && slug) {
      const cat = this.categories().find((c) => c.slug === slug);
      this.currentCategory.set(cat);
      this.pageTitle.set(cat?.name ?? 'Shop');
      this.productService.getAll({ categoryId: cat?.id }).subscribe((v) => this.allProducts.set(v));
    } else if (this.mode === 'occasion' && slug) {
      const occ = this.occasions().find((o) => o.slug === slug);
      this.currentOccasion.set(occ);
      this.pageTitle.set(occ?.name ?? 'Shop by Occasion');
      this.productService.getAll().subscribe((v) => {
        this.allProducts.set(occ ? v.filter((p) => p.occasion.includes(occ.name)) : v);
      });
    } else if (this.mode === 'new-arrivals') {
      this.pageTitle.set('New Arrivals');
      this.productService.getAll().subscribe((v) => this.allProducts.set(v.filter((p) => p.isNewArrival)));
    } else if (this.mode === 'sale') {
      this.pageTitle.set('Sale');
      this.productService.getAll().subscribe((v) => this.allProducts.set(v.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)));
    } else {
      this.pageTitle.set('Shop All');
      this.productService.getAll().subscribe((v) => this.allProducts.set(v));
    }
  }

  protected breadcrumbs = computed<Crumb[]>(() => [{ label: 'Home', link: '/' }, { label: this.pageTitle() }]);
}
