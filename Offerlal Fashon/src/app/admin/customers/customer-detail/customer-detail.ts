import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-admin-customer-detail',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe, DatePipe],
  templateUrl: './customer-detail.html',
  styleUrl: '../../orders/order-detail/order-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetail implements OnInit {
  private store = inject(DemoDataStoreService);
  private route = inject(ActivatedRoute);
  protected customerId = signal('');

  protected customer = computed(() => this.store.customers().find((c) => c.id === this.customerId()));
  protected orders = computed(() =>
    this.store
      .orders()
      .filter((o) => o.customerId === this.customerId())
      .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt)),
  );
  protected reviews = computed(() => this.store.reviews().filter((r) => r.customerId === this.customerId()));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.customerId.set(id);
  }
}
