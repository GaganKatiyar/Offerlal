import { Injectable, computed, signal } from '@angular/core';

/**
 * Arbitrates the one piece of screen a phone cannot share: the bottom edge.
 *
 * The storefront now has a persistent bottom navigation, and the product page
 * already has its own sticky Add-to-Bag bar. Both are ~56px. Shown together on
 * a 360x640 handset they take a fifth of the viewport and the nav sits under
 * the primary CTA, which is the worst possible place for it.
 *
 * So a page may CLAIM the bottom edge while it is open, and the navigation
 * steps aside until every claim is released.
 *
 * A counter rather than a boolean because claims legitimately overlap during an
 * Angular route transition: the incoming component's constructor runs before
 * the outgoing component's DestroyRef callback, so PDP → PDP would otherwise
 * release the claim the new page had just taken and leave both bars visible.
 */
@Injectable({ providedIn: 'root' })
export class LayoutChromeService {
  private readonly claims = signal(0);

  /** True while any page is occupying the bottom edge with its own bar. */
  readonly bottomEdgeClaimed = computed(() => this.claims() > 0);

  /**
   * Claims the bottom edge. Returns the release function.
   *
   * Call it from a component's constructor and hand the result to
   * `DestroyRef.onDestroy`, so the claim cannot outlive the page that made it:
   *
   *   const release = chrome.claimBottomEdge();
   *   inject(DestroyRef).onDestroy(release);
   */
  claimBottomEdge(): () => void {
    this.claims.update((n) => n + 1);

    let released = false;
    return () => {
      // Guarded: a double release would drive the count negative and leave the
      // navigation permanently hidden, which is far harder to notice than two
      // bars on screen.
      if (released) return;
      released = true;
      this.claims.update((n) => Math.max(0, n - 1));
    };
  }
}
