import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * A full-width promotional band.
 *
 * `promo-strip` has been a registered section type since the CMS work with no
 * component behind it. Myntra uses these to break the page's rhythm and carry
 * an offer; here it is CMS-driven so the copy, link and schedule are the
 * owner's to change without a deploy.
 */
@Component({
  selector: 'app-promo-strip',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promo-strip.html',
  styleUrl: './promo-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoStrip {
  heading = input<string | null | undefined>();
  subheading = input<string | null | undefined>();
  ctaLabel = input<string | null | undefined>();
  ctaUrl = input<string | null | undefined>();
}
