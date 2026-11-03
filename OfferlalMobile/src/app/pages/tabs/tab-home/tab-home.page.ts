import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline, searchOutline } from 'ionicons/icons';
import { MobileCategory, MobileProduct } from '../../../data/mock-data';
import { CatalogApiService } from '../../../services/catalog-api.service';
import { ProductCardComponent } from '../../../components/product-card/product-card.component';

@Component({
  selector: 'app-tab-home',
  templateUrl: 'tab-home.page.html',
  styleUrls: ['tab-home.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonContent,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    ProductCardComponent,
  ],
})
export class TabHomePage implements OnInit {
  private catalog = inject(CatalogApiService);

  protected categories = signal<MobileCategory[]>([]);
  protected newArrivals = signal<MobileProduct[]>([]);
  protected bestsellers = signal<MobileProduct[]>([]);
  protected loading = signal(true);
  protected failed = signal(false);

  constructor(private router: Router) {
    addIcons({ notificationsOutline, searchOutline });
  }

  ngOnInit(): void {
    this.load();
  }

  /**
   * Both rails come from the server now.
   *
   * The old `filter(p => p.isNewArrival || true)` was a placeholder that let
   * everything through, so "New Arrivals" was just the first four products in
   * the file. The API has a real flag, so the rail asks for it.
   */
  protected load(event?: { target: { complete: () => void } }): void {
    this.loading.set(true);
    this.failed.set(false);

    this.catalog.products({ isNewArrival: true, pageSize: 6 }).subscribe({
      next: (page) => {
        this.newArrivals.set(page.items);
        this.loading.set(false);
        event?.target.complete();
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
        event?.target.complete();
      },
    });

    // "bestselling" is one of the sorts the API actually implements. "popular"
    // is not, and an unrecognised sort falls through to the default ordering
    // rather than erroring - so the rail would have quietly shown featured
    // products under a Best Sellers heading.
    this.catalog.products({ sort: 'bestselling', pageSize: 6 }).subscribe({
      next: (page) => this.bestsellers.set(page.items),
      error: () => this.bestsellers.set([]),
    });

    this.catalog.categories().subscribe({
      next: (c) => this.categories.set(c),
      error: () => this.categories.set([]),
    });
  }

  openCategory(categoryId: string): void {
    this.router.navigate(['/tabs/shop'], { queryParams: { categoryId } });
  }

  openSearch(): void {
    this.router.navigate(['/search']);
  }
}
