import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService, AccountOrderSummary } from '../../../../core/services/account-api.service';
import { InrCurrencyPipe } from '../../../../shared/pipes/inr-currency.pipe';

/**
 * Order history, from the server.
 *
 * It read DemoDataStoreService, which resets on reload and is per-browser, so
 * the history shown here had nothing to do with what the customer had actually
 * bought — and differed from what the same account showed in the app.
 */
@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe],
  templateUrl: './order-list.html',
  styleUrl: '../../dashboard/dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderList implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(AccountApiService);

  protected orders = signal<AccountOrderSummary[]>([]);
  protected loading = signal(true);
  protected failed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.orders().subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }
}
