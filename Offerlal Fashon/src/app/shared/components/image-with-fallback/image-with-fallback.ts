import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const FALLBACK_SRC = '/images/placeholder-product.svg';

/** Widths the Pexels CDN is asked for. It resizes on demand, so any set works. */
const EXTERNAL_SRCSET_WIDTHS = [480, 800, 1200, 1600];

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

  /**
   * Derivative widths that actually exist for an own-hosted image, from the
   * media library.
   *
   * This must be supplied rather than assumed: derivatives are only generated
   * when they are smaller than the source, so a 600px upload has none and
   * requesting `-1600` would 404. An empty list means "no variants", not "try
   * the defaults".
   */
  derivativeWidths = input<readonly number[]>([]);

  protected loaded = signal(false);
  protected errored = signal(false);

  protected resolvedSrc(): string {
    return this.errored() ? FALLBACK_SRC : this.src();
  }

  /**
   * Builds a srcset so a phone doesn't download the desktop-sized image — the
   * main LCP lever available in a client-rendered SPA with no SSR.
   *
   * Two sources need different handling:
   *
   *  - External (Pexels): width is a `w=` query parameter their CDN honours,
   *    so any width can be requested and it resizes on the fly.
   *  - Own-hosted: widths are pre-generated files named `<key>-<width>.webp`
   *    by the media library. Only the widths it reports exist, which is why
   *    this cannot guess.
   *
   * Before the media library there was no second branch at all, so every
   * own-hosted image was served at full size to every device.
   */
  protected srcset = computed<string | null>(() => {
    const url = this.resolvedSrc();
    if (this.errored()) return null;

    if (url.includes('images.pexels.com') && url.includes('w=')) {
      return EXTERNAL_SRCSET_WIDTHS.map((w) => `${url.replace(/w=\d+/, `w=${w}`)} ${w}w`).join(', ');
    }

    const widths = this.derivativeWidths();
    if (widths.length === 0) return null;

    // Media library convention: "/media/2026/09/abc123.webp" has siblings
    // "/media/2026/09/abc123-480.webp" and so on.
    const dot = url.lastIndexOf('.');
    if (dot <= 0) return null;
    const stem = url.slice(0, dot);
    const ext = url.slice(dot);

    // The original is included as the largest candidate so a wide viewport
    // still gets full resolution rather than capping at the biggest derivative.
    const candidates = widths.map((w) => `${stem}-${w}${ext} ${w}w`);
    return candidates.join(', ');
  });

  protected onError(): void {
    if (!this.errored()) this.errored.set(true);
    this.loaded.set(true);
  }

  protected onLoad(): void {
    this.loaded.set(true);
  }
}
