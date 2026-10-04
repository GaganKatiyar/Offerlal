import { Injectable, signal } from '@angular/core';

/**
 * Open/close state for the full-screen mobile search.
 *
 * A service rather than component state because two unrelated places open it —
 * the header's search icon and the bottom navigation's Search tab — and neither
 * owns the other. Mirrors how CartService already arbitrates the cart drawer.
 */
@Injectable({ providedIn: 'root' })
export class SearchOverlayService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
