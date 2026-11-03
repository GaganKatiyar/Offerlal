import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from './skeleton';

/**
 * A placeholder shaped like a product card.
 *
 * Deliberately mirrors the real card's media aspect and text rhythm. A generic
 * grey box would still shift the grid when the cards arrive, which is most of
 * what a skeleton exists to prevent.
 */
@Component({
  selector: 'app-product-card-skeleton',
  standalone: true,
  imports: [Skeleton],
  template: `
    @for (i of slots(); track i) {
      <div class="card-sk">
        <app-skeleton variant="card" />
        <div class="card-sk__text">
          <app-skeleton variant="text" width="40%" />
          <app-skeleton variant="text" [lines]="2" />
          <app-skeleton variant="text" width="55%" />
        </div>
      </div>
    }
  `,
  styleUrl: './product-card-skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardSkeleton {
  /** How many placeholders to draw — usually the page size. */
  count = input(6);

  protected slots = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
