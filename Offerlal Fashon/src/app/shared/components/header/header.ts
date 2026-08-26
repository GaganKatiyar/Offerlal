import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models';

interface NavLink {
  label: string;
  link: string;
  icon: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'New Arrivals', link: '/new-arrivals', icon: '✨' },
  { label: 'Lehengas', link: '/category/bridal-lehengas', icon: '👗' },
  { label: 'Bridal', link: '/bridal', icon: '💍' },
  { label: 'Wedding Edit', link: '/occasion/wedding-guest', icon: '🎊' },
  { label: 'Bridesmaids', link: '/occasion/sangeet-mehendi', icon: '👯' },
  { label: 'Collections', link: '/collections', icon: '🗂️' },
  { label: 'Sale', link: '/sale', icon: '🏷️' },
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected navLinks = NAV_LINKS;
  protected cart = inject(CartService);
  protected wishlist = inject(WishlistService);
  protected auth = inject(AuthService);
  private products = inject(ProductService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  protected mobileMenuOpen = signal(false);
  protected suggestionsOpen = signal(false);
  protected searchQuery = signal('');
  protected searchResults = signal<Product[]>([]);

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected onSearchFocus(): void {
    this.suggestionsOpen.set(true);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.suggestionsOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.suggestionsOpen.set(false);
    }
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.suggestionsOpen.set(true);
    if (value.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.products.search(value, 6).subscribe((results) => this.searchResults.set(results));
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
}
