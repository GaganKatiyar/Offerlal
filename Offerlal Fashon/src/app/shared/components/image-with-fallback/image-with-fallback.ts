import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const FALLBACK_SRC = '/images/placeholder-product.svg';
const SRCSET_WIDTHS = [480, 800, 1200, 1600];

@Component({
  selector: 'app-image-with-fallback',
  standalone: true,
  templateUrl: './image-with-fallback.html',
  styleUrl: './image-with-fallback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageWithFallback {
  src = input.required<string>();
  alt = input<string>('');
  loadingMode = input<'lazy' | 'eager'>('lazy');
  /** e.g. "(min-width: 1024px) 50vw, 100vw" — only used when the source supports width variants. */
  sizes = input<string>('100vw');

  protected loaded = signal(false);
  protected errored = signal(false);

  protected resolvedSrc(): string {
    return this.errored() ? FALLBACK_SRC : this.src();
  }

  /** For Pexels URLs (which encode width as a `w=` query param) build a srcset so mobile
   * viewports don't download the full desktop-sized image — this is the main lever available
   * for LCP in a client-rendered SPA without SSR. */
  protected srcset = computed<string | null>(() => {
    const url = this.resolvedSrc();
    if (!url.includes('images.pexels.com') || !url.includes('w=')) return null;
    return SRCSET_WIDTHS.map((w) => `${url.replace(/w=\d+/, `w=${w}`)} ${w}w`).join(', ');
  });

  protected onError(): void {
    if (!this.errored()) this.errored.set(true);
    this.loaded.set(true);
  }

  protected onLoad(): void {
    this.loaded.set(true);
  }
}
