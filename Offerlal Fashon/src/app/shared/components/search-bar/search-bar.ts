import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Product } from '../../../core/models';
import { ProductService } from '../../../core/services/product.service';
import { TRENDING_SEARCH_TERMS } from '../../../core/constants/search-terms';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

/**
 * Header search with typeahead.
 *
 * Extracted from Header so the header, the search page and (from Phase 6) the
 * mobile full-screen overlay share one implementation instead of three.
 *
 * The extraction also fixes a live bug. The previous implementation called
 * `products.search()` on every keystroke with a bare `.subscribe()`: no
 * debounce, no cancellation. Responses were applied in whatever order they
 * arrived, so a slow request for "leh" could land after a fast one for
 * "lehenga" and leave the dropdown showing results for a query the shopper had
 * already moved past. `switchMap` cancels the in-flight request on each new
 * term, which makes the last request the only one that can win.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  /**
   * Rendered inside the full-screen mobile overlay.
   *
   * Changes three behaviours rather than just appearance: suggestions flow
   * inline instead of hanging in a floating panel (there is nothing to float
   * over), they stay open because the overlay IS the search context, and the
   * field takes focus on open so the keyboard appears without a second tap.
   */
  overlay = input(false);

  private products = inject(ProductService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  protected trending = TRENDING_SEARCH_TERMS;
  protected suggestionsOpen = signal(false);
  protected searchQuery = signal('');

  private readonly term$ = new Subject<string>();

  constructor() {
    afterNextRender(() => {
      if (!this.overlay()) return;
      // Open with the suggestions already showing (trending terms), so the
      // overlay is useful before a single character is typed.
      this.suggestionsOpen.set(true);
      this.host.nativeElement.querySelector('input')?.focus();
    });
  }

  protected searchResults = toSignal(
    this.term$.pipe(
      debounceTime(DEBOUNCE_MS),
      map((v) => v.trim()),
      distinctUntilChanged(),
      switchMap((q) =>
        q.length < MIN_QUERY_LENGTH ? of<Product[]>([]) : this.products.search(q, MAX_SUGGESTIONS),
      ),
    ),
    { initialValue: [] as Product[] },
  );

  protected onSearchFocus(): void {
    this.suggestionsOpen.set(true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // In the overlay the panel is the screen, so a click-away would close the
    // suggestions the moment the shopper touched anything.
    if (this.overlay()) return;
    if (this.suggestionsOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.suggestionsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // The overlay handles Escape itself, by closing entirely.
    if (this.overlay()) return;
    this.suggestionsOpen.set(false);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.suggestionsOpen.set(true);
    this.term$.next(value);
  }

  protected submitSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.suggestionsOpen.set(false);
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected goToProduct(slug: string): void {
    this.suggestionsOpen.set(false);
    this.searchQuery.set('');
    this.router.navigate(['/product', slug]);
  }

  protected closeSuggestions(): void {
    this.suggestionsOpen.set(false);
  }
}
