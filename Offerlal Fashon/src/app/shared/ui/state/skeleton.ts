import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'line' | 'rect' | 'card' | 'circle';

/**
 * A loading placeholder.
 *
 * Screens here previously showed nothing at all while data was in flight, so a
 * slow network read as an empty shop. A placeholder that occupies the same
 * space the content will occupy also removes the layout shift when it arrives.
 *
 * Decorative by definition: marked aria-hidden, and callers announce loading
 * once on the region rather than letting a screen reader walk twelve empty
 * boxes.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <span
      class="sk"
      [class]="'sk--' + variant()"
      [style.width]="width()"
      [style.height]="height()"
      aria-hidden="true"
    ></span>
    @if (variant() === 'text') {
      @for (i of extraLines(); track i) {
        <span class="sk sk--text sk--last" aria-hidden="true"></span>
      }
    }
  `,
  styleUrl: './skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  variant = input<SkeletonVariant>('text');
  /** Number of text lines. Only meaningful for the `text` variant. */
  lines = input(1);
  width = input<string | undefined>(undefined);
  height = input<string | undefined>(undefined);

  /** The first line is rendered by the host element, so this is lines - 1. */
  protected extraLines = computed(() =>
    Array.from({ length: Math.max(0, this.lines() - 1) }, (_, i) => i),
  );
}
