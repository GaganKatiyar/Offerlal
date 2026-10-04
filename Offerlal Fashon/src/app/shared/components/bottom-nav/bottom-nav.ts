import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { LayoutChromeService } from '../../../core/services/layout-chrome.service';

/**
 * Persistent bottom navigation for phones.
 *
 * The storefront had none — every journey ran through a hamburger drawer, which
 * costs two taps and hides the bag behind a menu. Five destinations, reachable
 * with a thumb, is the single biggest mobile navigation change in this redesign.
 *
 * Hidden from `lg` up, where the full header already carries this navigation.
 *
 * Bag opens the existing cart drawer rather than routing to /cart. Keeping the
 * customer on the page they were browsing is the whole reason that drawer was
 * built, and routing away from a product list to a full bag page is exactly the
 * flow it replaced.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  protected cart = inject(CartService);
  protected wishlist = inject(WishlistService);
  private chrome = inject(LayoutChromeService);

  /**
   * Stand aside while a page owns the bottom edge.
   *
   * Today that is the product page's Add-to-Bag bar. Two stacked 56px bars eat
   * a fifth of a small phone and put navigation under the primary CTA.
   */
  protected hidden = this.chrome.bottomEdgeClaimed;

  /** Badges stop being useful past two digits and start breaking the layout. */
  protected badge(count: number): string | null {
    if (count <= 0) return null;
    return count > 99 ? '99+' : String(count);
  }
}
