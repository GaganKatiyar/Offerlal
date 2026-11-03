import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant =
  | 'deal'
  | 'bestseller'
  | 'new'
  | 'sale'
  | 'trending'
  | 'limited'
  | 'low-stock'
  | 'out-of-stock'
  | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="badge badge-{{ variant() }}"><ng-content /></span>`,
  styleUrl: './badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  variant = input<BadgeVariant>('neutral');
}
