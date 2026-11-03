import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle } from 'ionicons/icons';
import { OrderDetail, OrderService } from '../../services/order.service';

/**
 * The receipt, read back from the server.
 *
 * Deliberately re-fetched rather than rendered from what the place-order call
 * returned: this is the first thing the customer sees after paying attention to
 * a total, and showing it from the server's own record is what makes it a
 * confirmation rather than an echo of the request.
 */
@Component({
  selector: 'app-order-confirmation',
  templateUrl: 'order-confirmation.page.html',
  styleUrls: ['order-confirmation.page.scss'],
  standalone: true,
  imports: [RouterLink, DatePipe, IonContent, IonIcon],
})
export class OrderConfirmationPage {
  private api = inject(OrderService);

  protected order = signal<OrderDetail | undefined>(undefined);
  protected loading = signal(true);
  protected orderNumber = signal<string>('');

  constructor(route: ActivatedRoute) {
    addIcons({ checkmarkCircle });
    const orderNumber = route.snapshot.paramMap.get('orderNumber') ?? '';
    this.orderNumber.set(orderNumber);

    if (!orderNumber) {
      this.loading.set(false);
      return;
    }

    this.api.get(orderNumber).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      // The order WAS placed - the number is in the URL because the server
      // returned it. A read failure here must not suggest otherwise, so the
      // template falls back to confirming the number without the detail.
      error: () => this.loading.set(false),
    });
  }
}
