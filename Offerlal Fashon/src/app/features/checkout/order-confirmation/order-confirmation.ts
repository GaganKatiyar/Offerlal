import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountApiService, AccountOrderDetail } from '../../../core/services/account-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

/** The little we are handed by checkout when it navigates here. */
interface PlacedOrderState {
  orderNumber: string;
  total: number;
  paymentStatus: string;
}

/**
 * The page a customer lands on after paying.
 *
 * It used to read DemoDataStoreService, which holds invented orders and has
 * never heard of a real one, so a genuine order rendered "Loading your
 * order..." forever. Harmless while nothing took money; not harmless now that
 * the step before it can charge a card.
 *
 * Three sources, in descending order of certainty:
 *   1. What checkout just handed over in the navigation state. Always correct,
 *      always present on the hop straight from placing the order, and gone the
 *      moment the page is reloaded.
 *   2. The server, for a signed-in customer. Survives a reload.
 *   3. Neither - a guest who refreshed. We still know the order number from the
 *      URL, so we confirm the order and say where to find it rather than
 *      pretending to be loading something that will never arrive.
 */
@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmation {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private account = inject(AccountApiService);
  protected auth = inject(AuthService);

  protected orderNumber = signal(this.route.snapshot.paramMap.get('orderNumber') ?? '');
  protected detail = signal<AccountOrderDetail | null>(null);
  protected loading = signal(false);

  /**
   * Read in the field initialiser, not ngOnInit.
   *
   * Navigation state is only reachable through the Router while the navigation
   * that carried it is still the current one; by the time a later lifecycle
   * hook runs it can already have been replaced.
   */
  protected placed = signal<PlacedOrderState | null>(
    (this.router.getCurrentNavigation()?.extras.state?.['placedOrder'] as PlacedOrderState | undefined) ??
      (history.state?.['placedOrder'] as PlacedOrderState | undefined) ??
      null,
  );

  /** Whether we can show a money breakdown at all, as opposed to just the number. */
  protected hasSummary = () => this.detail() !== null || this.placed() !== null;

  protected total = () => this.detail()?.total ?? this.placed()?.total ?? null;

  protected paymentStatus = () => this.detail()?.paymentStatus ?? this.placed()?.paymentStatus ?? null;

  /** Never claims money has been taken unless the server says it has. */
  protected isPaid = () => (this.paymentStatus() ?? '').toLowerCase() === 'paid';

  constructor() {
    // A signed-in customer gets the authoritative copy, which also replaces the
    // handed-over summary with the full one after a reload.
    if (this.orderNumber() && this.auth.isLoggedIn()) {
      this.loading.set(true);
      this.account.order(this.orderNumber()).subscribe({
        next: (o) => {
          this.detail.set(o);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }
}
