import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRating {
  rating = input.required<number>();
  showValue = input(false);
  size = input<'sm' | 'md'>('sm');

  protected stars = computed(() => {
    const r = this.rating();
    return Array.from({ length: 5 }, (_, i) => {
      const fill = Math.max(0, Math.min(1, r - i));
      return Math.round(fill * 100);
    });
  });
}
