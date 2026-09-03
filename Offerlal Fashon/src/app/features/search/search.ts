import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { POPULAR_SEARCH_TERMS } from '../../core/constants/search-terms';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ProductCard],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);

  protected query = signal('');
  protected results = signal<Product[]>([]);
  protected loading = signal(false);
  protected trending = POPULAR_SEARCH_TERMS.map((t) => t.label);
  protected recentSearches = signal<string[]>([]);

  ngOnInit(): void {
    this.recentSearches.set(this.readRecent());
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') ?? '';
      this.query.set(q);
      if (q) this.runSearch(q);
    });
  }

  private readRecent(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('offerlal_recent_searches') ?? '[]');
    } catch {
      return [];
    }
  }

  private saveRecent(q: string): void {
    if (typeof localStorage === 'undefined') return;
    const list = [q, ...this.recentSearches().filter((r) => r !== q)].slice(0, 6);
    this.recentSearches.set(list);
    localStorage.setItem('offerlal_recent_searches', JSON.stringify(list));
  }

  protected runSearch(q: string): void {
    this.loading.set(true);
    this.productService.search(q, 24).subscribe((results) => {
      this.results.set(results);
      this.loading.set(false);
      this.saveRecent(q);
    });
  }

  protected searchFor(q: string): void {
    this.router.navigate(['/search'], { queryParams: { q } });
  }
}
