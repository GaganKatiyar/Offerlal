import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

const WHATSAPP_NUMBER = '917390965819';
const REVEAL_AFTER_SCROLL_PX = 320;

@Component({
  selector: 'app-whatsapp-float-button',
  standalone: true,
  templateUrl: './whatsapp-float-button.html',
  styleUrl: './whatsapp-float-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappFloatButton {
  private router = inject(Router);
  protected href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I would like to know more about your collections.')}`;

  // Hidden on product pages, which already show an inline "Ask on WhatsApp" CTA —
  // the floating bubble there just overlaps the gallery/reviews with no added value.
  protected hidden = signal(this.router.url.startsWith('/product/'));

  // Stays out of the way of hero content and above-the-fold CTAs; only appears
  // once the visitor has actually started reading the page.
  protected scrolled = signal(typeof window !== 'undefined' && window.scrollY > REVEAL_AFTER_SCROLL_PX);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.hidden.set((e as NavigationEnd).urlAfterRedirects.startsWith('/product/'));
      this.scrolled.set(window.scrollY > REVEAL_AFTER_SCROLL_PX);
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > REVEAL_AFTER_SCROLL_PX);
  }
}
