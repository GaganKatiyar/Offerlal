import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * How a section heading is treated.
 *
 * `commerce` — Myntra's shape: one bold uppercase sans heading, centred, no
 * eyebrow. Dense pages use this so the heading orients without competing with
 * the products underneath it.
 *
 * `editorial` — the original treatment: gold uppercase eyebrow above a large
 * Jost display heading. Kept deliberately for About, the bridal edit and the
 * concierge, where the heading IS the content and the brand voice matters more
 * than density.
 */
export type SectionHeaderDensity = 'commerce' | 'editorial';

/**
 * A CMS-driven section heading.
 *
 * The homepage previously repeated the same gold-eyebrow + 44px centred Jost
 * heading ten times, with 40px beneath each. At that scale the eyebrow reads as
 * decoration rather than information, and the page becomes a sequence of title
 * cards with content between them — the opposite of Myntra, where a heading is
 * a small label and the merchandise is the page.
 */
@Component({
  selector: 'app-section-header',
  standalone: true,
  templateUrl: './section-header.html',
  styleUrl: './section-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"section-header section-header--" + density()',
  },
})
export class SectionHeader {
  eyebrow = input<string | null | undefined>();
  heading = input<string | null | undefined>();
  subheading = input<string | null | undefined>();

  density = input<SectionHeaderDensity>('commerce');

  /** Optional "View all" style link, from the section's CTA fields. */
  ctaLabel = input<string | null | undefined>();
  ctaUrl = input<string | null | undefined>();
}
