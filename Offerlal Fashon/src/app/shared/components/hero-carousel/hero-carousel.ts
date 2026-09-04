import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentItem } from '../../../core/models/content.model';
import { ImageWithFallback } from '../image-with-fallback/image-with-fallback';

const AUTOPLAY_MS = 5000;

/**
 * The full-bleed hero at the top of the homepage.
 *
 * `hero-carousel` has been a registered section type since the CMS work with no
 * component behind it, so the homepage began with a section heading and no
 * image — the single biggest reason it did not read as Myntra, where the first
 * pixel is a banner.
 *
 * Native scroll-snap rather than a carousel library: the browser already does
 * momentum, touch, keyboard and accessibility correctly, and a library would be
 * ~30KB to reimplement them slightly worse.
 *
 * LCP note — this is the largest element on the page in a client-rendered SPA
 * with no SSR, so the first slide is eager with fetchpriority=high and explicit
 * dimensions, and the slide count is capped. The real fix remains SSR.
 */
@Component({
  selector: 'app-hero-carousel',
  standalone: true,
  imports: [RouterLink, ImageWithFallback],
  templateUrl: './hero-carousel.html',
  styleUrl: './hero-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroCarousel implements OnDestroy {
  slides = input<ContentItem[]>([]);

  private doc = inject(DOCUMENT);
  private track = viewChild<ElementRef<HTMLElement>>('track');

  protected active = signal(0);

  /**
   * Capped at four.
   *
   * Every slide is a large image the browser may fetch, and past four nobody
   * scrolls anyway — the cost is real and the benefit is not.
   */
  protected visible = computed(() => this.slides().slice(0, 4));

  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;

  constructor() {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private prefersReducedMotion(): boolean {
    return this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private startAutoplay(): void {
    // Auto-advancing content is a genuine accessibility problem for anyone who
    // needs time to read, so reduced-motion disables it entirely rather than
    // merely removing the transition.
    if (this.prefersReducedMotion()) return;

    this.timer = setInterval(() => {
      if (this.paused) return;
      const count = this.visible().length;
      if (count < 2) return;
      this.goTo((this.active() + 1) % count);
    }, AUTOPLAY_MS);
  }

  private stopAutoplay(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Pauses while the pointer or keyboard focus is inside the hero. */
  protected pause(): void {
    this.paused = true;
  }

  protected resume(): void {
    this.paused = false;
  }

  protected goTo(index: number): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' });
    this.active.set(index);
  }

  /**
   * Derives the active slide from scroll position rather than tracking it
   * separately, so a swipe and a dot click cannot disagree about which slide
   * is showing.
   */
  protected onScroll(): void {
    const el = this.track()?.nativeElement;
    if (!el || el.clientWidth === 0) return;
    this.active.set(Math.round(el.scrollLeft / el.clientWidth));
  }
}
