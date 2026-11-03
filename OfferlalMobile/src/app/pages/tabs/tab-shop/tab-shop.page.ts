import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MobileCategory, MobileProduct } from '../../../data/mock-data';
import { ProductCardComponent } from '../../../components/product-card/product-card.component';
import { CatalogApiService } from '../../../services/catalog-api.service';

const PAGE_SIZE = 12;

/**
 * The shop tab.
 *
 * Filtering used to be `PRODUCTS.filter(...)` over eight hardcoded items, which
 * worked only because the whole catalogue fitted in the bundle. The server does
 * the filtering now and returns a page at a time, so this holds an accumulating
 * list plus the page cursor rather than a computed over everything.
 */
@Component({
  selector: 'app-tab-shop',
  templateUrl: 'tab-shop.page.html',
  styleUrls: ['tab-shop.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSkeletonText,
    ProductCardComponent,
  ],
})
export class TabShopPage implements OnInit {
  private catalog = inject(CatalogApiService);
  private route = inject(ActivatedRoute);

  protected categories = signal<MobileCategory[]>([]);
  protected activeCategory = signal<string | null>(null);
  protected products = signal<MobileProduct[]>([]);
  protected total = signal(0);
  protected hasNext = signal(false);
  protected loading = signal(true);
  protected failed = signal(false);

  private page = 1;

  ngOnInit(): void {
    this.catalog.categories().subscribe({
      next: (c) => this.categories.set(c),
      error: () => this.categories.set([]),
    });

    this.route.queryParams.subscribe((params) => {
      this.activeCategory.set(params['categoryId'] ?? null);
      this.reload();
    });
  }

  select(categoryId: string | null): void {
    if (this.activeCategory() === categoryId) return;
    this.activeCategory.set(categoryId);
    this.reload();
  }

  /** Back to page 1 — used on filter change and pull-to-refresh. */
  protected reload(event?: { target: { complete: () => void } }): void {
    this.page = 1;
    this.products.set([]);
    this.loading.set(true);
    this.failed.set(false);
    this.fetch(() => event?.target.complete());
  }

  protected loadMore(event: { target: { complete: () => void } }): void {
    if (!this.hasNext()) {
      event.target.complete();
      return;
    }
    this.page += 1;
    this.fetch(() => event.target.complete());
  }

  private fetch(done: () => void): void {
    this.catalog
      .products({
        categoryId: this.activeCategory() ?? undefined,
        page: this.page,
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (res) => {
          // Append rather than replace, so infinite scroll accumulates. Page 1
          // has already cleared the list in reload().
          this.products.update((current) => [...current, ...res.items]);
          this.total.set(res.total);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
          done();
        },
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
          // Step back so a retry re-requests the page that failed rather than
          // skipping it and leaving a hole in the list.
          if (this.page > 1) this.page -= 1;
          done();
        },
      });
  }
}
