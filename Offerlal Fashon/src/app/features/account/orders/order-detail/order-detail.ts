import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AccountApiService, AccountOrderDetail } from '../../../../core/services/account-api.service';
import { StateBlock } from '../../../../shared/ui/state';
import { InrCurrencyPipe } from '../../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, DatePipe, StateBlock],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AccountApiService);

  protected order = signal<AccountOrderDetail | undefined>(undefined);
  protected loading = signal(true);
  /** Distinguishes "not yours / no such order" from a network failure. */
  protected notFound = signal(false);
  /** A failure to reach the server, which is worth offering a retry for. */
  protected failed = signal(false);

  ngOnInit(): void {
    this.load();
  }

  /**
   * Fetches the order.
   *
   * The three outcomes are kept apart deliberately. The template used to render
   * "Order not found" for anything that was not a loaded order, so a slow
   * connection told a customer their order did not exist — the one message most
   * likely to make someone phone and complain about an order that was fine.
   */
  protected load(): void {
    const orderNumber = this.route.snapshot.paramMap.get('orderNumber');
    if (!orderNumber) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.failed.set(false);

    this.api.order(orderNumber).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const status = (err as { status?: number })?.status;
        // 404 is the server saying this order is not yours or does not exist.
        // Anything else is a failure to ask, which is retryable.
        if (status === 404) this.notFound.set(true);
        else this.failed.set(true);
      },
    });
  }
}
