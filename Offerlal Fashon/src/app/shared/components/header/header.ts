import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { SearchBar } from '../search-bar/search-bar';

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
  imports: [RouterLink, RouterLinkActive, SearchBar],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected navLinks = NAV_LINKS;
  protected cart = inject(CartService);
  protected wishlist = inject(WishlistService);
  protected auth = inject(AuthService);

  protected mobileMenuOpen = signal(false);

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
