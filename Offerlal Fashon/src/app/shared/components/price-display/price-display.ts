import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';

@Component({
  selector: 'app-price-display',
  standalone: true,
  imports: [InrCurrencyPipe],
  templateUrl: './price-display.html',
  styleUrl: './price-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceDisplay {
  price = input.required<number>();
  compareAtPrice = input<number | undefined>();
  size = input<'sm' | 'md' | 'lg'>('md');

  protected discountPercent = computed(() => {
    const compare = this.compareAtPrice();
    const price = this.price();
    if (!compare || compare <= price) return null;
    return Math.round(((compare - price) / compare) * 100);
  });
}
