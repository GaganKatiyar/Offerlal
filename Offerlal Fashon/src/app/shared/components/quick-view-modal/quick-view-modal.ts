import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from '../../ui/modal/modal';
import { ImageWithFallback } from '../image-with-fallback/image-with-fallback';
import { PriceDisplay } from '../price-display/price-display';
import { StarRating } from '../star-rating/star-rating';
import { QuickViewService } from '../../../core/services/quick-view.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-quick-view-modal',
  standalone: true,
  imports: [RouterLink, Modal, ImageWithFallback, PriceDisplay, StarRating],
  templateUrl: './quick-view-modal.html',
  styleUrl: './quick-view-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickViewModal {
  protected quickViewService = inject(QuickViewService);
  private cart = inject(CartService);
  private toast = inject(ToastService);

  protected selectedSize = signal<string | null>(null);

  protected product = this.quickViewService.product;
  protected isOpen = computed(() => this.product() !== null);
  protected primaryImage = computed(() => this.product()?.variants[0]?.images[0]?.url ?? '');

  constructor() {
    // Reset size selection whenever a new product is shown
    effect(() => {
      const sizes = this.product()?.sizes ?? [];
      this.selectedSize.set(sizes.find((s) => s !== 'Custom') ?? sizes[0] ?? null);
    });
  }

  protected selectSize(size: string): void {
    this.selectedSize.set(size);
  }

  protected close(): void {
    this.quickViewService.close();
  }

  protected addToBag(): void {
    const p = this.product();
    const size = this.selectedSize();
    if (!p || !size) return;
    const variant = p.variants[0];
    this.cart.add(p, variant, size, 1);
    this.toast.show(`${p.name} added to your bag`);
    this.close();
  }
}
