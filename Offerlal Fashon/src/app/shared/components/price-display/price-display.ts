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

  /**
   * Whether to print the "X% OFF" figure alongside the prices.
   *
   * Off on product cards, which show the same percentage as a badge over the
   * image. Printing it twice on one card is duplicated information competing
   * for the same glance, and it costs a line of vertical space in a dense grid.
   * On the product page, where there is no badge, it stays on.
   */
  showDiscount = input(true);

  protected discountPercent = computed(() => {
    const compare = this.compareAtPrice();
    const price = this.price();
    if (!compare || compare <= price) return null;
    return Math.round(((compare - price) / compare) * 100);
  });
}
