import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';

/**
 * A horizontally scrolling rail with edge affordances.
 *
 * Six of the homepage's section types are named "…-rail" and every one of them
 * rendered as a wrapping CSS grid — the `.o-rail` utility built in Phase 1 had
 * zero call sites. A grid of eight tiles occupies eight tiles' worth of height;
 * a rail occupies one row and implies there is more, which is most of what makes
 * a dense homepage feel dense.
 *
 * Scrolling is native (`overflow-x` + `scroll-snap`), not a carousel library.
 * The arrows are a POINTER convenience only — on touch the finger is the
 * control, and a fade plus a partially visible next tile already say "scrollable"
 * more clearly than a button would.
 */
@Component({
  selector: 'app-scroll-rail',
  standalone: true,
  templateUrl: './scroll-rail.html',
  styleUrl: './scroll-rail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollRail {
  private track = viewChild.required<ElementRef<HTMLElement>>('track');

  /** Whether there is content beyond each edge, so a dead arrow is never shown. */
  protected canScrollStart = signal(false);
  protected canScrollEnd = signal(false);

  constructor() {
    // Measured after the first render: before content is projected the track has
    // no scrollWidth and both arrows would read as disabled.
    afterNextRender(() => this.measure());
  }

  protected measure(): void {
    const el = this.track().nativeElement;
    // 1px of slack: fractional scroll positions from zoom or a trackpad would
    // otherwise leave the end arrow enabled at the true end of the rail.
    this.canScrollStart.set(el.scrollLeft > 1);
    this.canScrollEnd.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  protected scrollBy(direction: -1 | 1): void {
    const el = this.track().nativeElement;
    // Roughly one viewport of the rail, less a sliver so the tile at the edge
    // stays partly visible and the eye keeps its place.
    const amount = Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }
}
