import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';
import { SearchBar } from '../search-bar/search-bar';
import { NavApiService, NavItem } from '../../../core/services/nav-api.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SearchBar],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  /**
   * Header links, from the CMS.
   *
   * Was a NAV_LINKS constant of seven hardcoded label/URL/emoji triples that
   * was NOT derived from the category tree, so renaming a category left the
   * nav pointing at a stale label or a dead URL.
   *
   * Falls back to an empty menu on error rather than breaking the header,
   * which renders on every route.
   */
  protected navLinks = toSignal(
    inject(NavApiService).getMenu('header').pipe(catchError(() => of<NavItem[]>([]))),
    { initialValue: [] as NavItem[] },
  );
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
