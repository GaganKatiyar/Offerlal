import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SearchBar } from '../search-bar/search-bar';
import { SearchOverlayService } from '../../../core/services/search-overlay.service';

/**
 * Full-screen search for phones.
 *
 * The header's search was an inline input that wrapped onto a third row,
 * permanently consuming about a sixth of the viewport on every page while being
 * too small to show useful suggestions. Every Indian marketplace instead puts a
 * search icon in the header and opens a dedicated screen, which is both less
 * chrome at rest and far more room once engaged.
 *
 * This is a host: the typeahead itself stays in SearchBar, so the header, the
 * search page and this overlay keep sharing one implementation rather than
 * drifting into three.
 */
@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [SearchBar],
  templateUrl: './search-overlay.html',
  styleUrl: './search-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchOverlay {
  protected search = inject(SearchOverlayService);
  private router = inject(Router);

  constructor() {
    // Picking a suggestion navigates. Without this the overlay would stay open
    // on top of the page it just sent you to.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.search.close();
    });

    // Lock the page behind the overlay. Without it, scrolling the overlay
    // scrolls the list underneath once the overlay's own content runs out,
    // and the position behind is lost on close.
    effect(() => {
      const open = this.search.isOpen();
      if (typeof document === 'undefined') return;
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.search.isOpen()) this.search.close();
  }

  protected close(): void {
    this.search.close();
  }
}
