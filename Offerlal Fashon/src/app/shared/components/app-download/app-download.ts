import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ContentItem } from '../../../core/models/content.model';

/**
 * The "get the app" band.
 *
 * Myntra runs one of these near the foot of the homepage, and the structure is
 * worth adopting: a device shot on one side, a short pitch and the two store
 * links on the other. The copy, the artwork and the links are Offerlal's own.
 *
 * The store buttons are typeset here rather than being reproductions of the
 * official Google Play and App Store badges. Those are trademarked artwork with
 * their own placement and clear-space rules, and are meant to be downloaded
 * from each vendor's brand resource page - a hand-drawn lookalike is both a
 * trademark problem and immediately obvious. Swapping in the real badges later
 * is a matter of replacing the button contents.
 *
 * A store link with no URL renders as a disabled "coming soon" chip instead of
 * a dead button, because the app is not published to either store yet.
 */
@Component({
  selector: 'app-app-download',
  standalone: true,
  templateUrl: './app-download.html',
  styleUrl: './app-download.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppDownload {
  heading = input<string | null | undefined>();
  subheading = input<string | null | undefined>();
  /** One item per store, from the CMS. */
  items = input<ContentItem[]>([]);
  /** Optional device shot; a CSS-drawn placeholder is used when absent. */
  imageUrl = input<string | null | undefined>();

  protected stores = computed(() => this.items().filter((i) => i.title));
}
