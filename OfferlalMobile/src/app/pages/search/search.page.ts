import { Component, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonContent } from '@ionic/angular';
import { MobileProduct } from '../../data/mock-data';
import { CatalogApiService } from '../../services/catalog-api.service';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

const POPULAR = ['bridal lehenga', 'red saree', 'party wear', 'gown under 25000'];

@Component({
  selector: 'app-search',
  templateUrl: 'search.page.html',
  styleUrls: ['search.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonSearchbar, IonContent, ProductCardComponent],
})
export class SearchPage {
  private catalog = inject(CatalogApiService);

  protected query = signal('');
  protected popular = POPULAR;
  protected results = signal<MobileProduct[]>([]);
  protected searching = signal(false);

  private typed$ = new Subject<string>();

  constructor() {
    // Debounced and switchMapped, so a fast typist does not fire a request per
    // keystroke and, more importantly, cannot have an earlier slower response
    // land after a later one and overwrite the results with stale matches.
    // The web header had exactly that bug before it was fixed.
    this.typed$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) {
            this.searching.set(false);
            return [{ items: [] as MobileProduct[], total: 0, hasNext: false }];
          }
          this.searching.set(true);
          return this.catalog.products({ search: q.trim(), pageSize: 20 });
        }),
      )
      .subscribe({
        next: (page) => {
          this.results.set(page.items);
          this.searching.set(false);
        },
        error: () => {
          this.results.set([]);
          this.searching.set(false);
        },
      });
  }

  setQuery(q: string): void {
    this.query.set(q);
    this.typed$.next(q);
  }
}
