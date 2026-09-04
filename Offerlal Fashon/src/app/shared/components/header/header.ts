import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
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

  // --- Mega menu ----------------------------------------------------------

  /**
   * Which tab's panel is open. Only one can be, so this is an id rather than a
   * flag per item.
   */
  protected openMenuId = signal<number | null>(null);

  /**
   * Hover intent.
   *
   * Opening on raw mouseenter makes the panel flash open while the pointer is
   * merely crossing the nav on its way somewhere else. A short delay before
   * closing also lets the pointer travel from the tab down into the panel
   * without the panel vanishing underneath it.
   */
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  protected openMenu = computed(() => {
    const id = this.openMenuId();
    return id === null ? null : (this.navLinks().find((i) => i.id === id) ?? null);
  });

  /** Children grouped into their mega-menu columns, in column order. */
  protected megaColumns = computed(() => {
    const menu = this.openMenu();
    if (!menu) return [];

    const titles: Record<number, string> = { 1: 'Shop by Category', 2: 'Shop by Occasion', 3: 'Shop by Price' };
    const byColumn = new Map<number, NavItem[]>();

    for (const child of menu.children) {
      const list = byColumn.get(child.columnIndex) ?? [];
      list.push(child);
      byColumn.set(child.columnIndex, list);
    }

    return [...byColumn.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, items]) => ({ index, title: titles[index] ?? '', items }));
  });

  protected openMega(item: NavItem): void {
    this.cancelClose();
    // A tab with no children is a plain link; opening an empty panel over the
    // page would be worse than not opening one.
    this.openMenuId.set(item.children.length > 0 ? item.id : null);
  }

  protected closeMega(): void {
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.openMenuId.set(null), 120);
  }

  protected cancelClose(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancelClose();
    this.openMenuId.set(null);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
