import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { Drawer } from '../../../shared/ui/drawer/drawer';
import { ImageWithFallback } from '../../../shared/components/image-with-fallback/image-with-fallback';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { QuantityStepper } from '../../../shared/components/quantity-stepper/quantity-stepper';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [Drawer, ImageWithFallback, InrCurrencyPipe, QuantityStepper, RouterLink],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawer {
  protected cart = inject(CartService);
  private store = inject(DemoDataStoreService);
  private router = inject(Router);

  protected productFor(productId: string) {
    return this.store.products().find((p) => p.id === productId);
  }

  protected checkout(): void {
    this.cart.closeDrawer();
    this.router.navigate(['/checkout']);
  }
}
