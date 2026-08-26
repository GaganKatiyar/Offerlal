import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CartService } from '../../../core/services/cart.service';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ProductCard } from '../../../shared/components/product-card/product-card';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './wishlist.html',
  styleUrl: '../dashboard/dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wishlist {
  protected auth = inject(AuthService);
  protected wishlist = inject(WishlistService);
  private cart = inject(CartService);
  private store = inject(DemoDataStoreService);
  private toast = inject(ToastService);

  protected products = computed(() =>
    this.wishlist
      .items()
      .map((w) => this.store.products().find((p) => p.id === w.productId))
      .filter((p): p is NonNullable<typeof p> => !!p),
  );

  protected moveAllToCart(): void {
    this.products().forEach((p) => {
      const variant = p.variants[0];
      const size = p.sizes.find((s) => s !== 'Custom') ?? p.sizes[0];
      this.cart.add(p, variant, size, 1);
    });
    this.toast.show('Added to your bag');
  }
}
