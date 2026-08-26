import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { CustomerSegment } from '../../../core/models';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-admin-customer-list',
  standalone: true,
  imports: [RouterLink, InrCurrencyPipe],
  templateUrl: './customer-list.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerList {
  private store = inject(DemoDataStoreService);
  protected query = signal('');
  protected segmentFilter = signal<CustomerSegment | 'all'>('all');
  protected segments: CustomerSegment[] = ['New', 'Repeat', 'VIP', 'Bridal', 'High-Value'];

  protected totalCount = computed(() => this.store.customers().length);

  protected segmentCounts = computed(() => {
    const counts = new Map<CustomerSegment, number>();
    this.store.customers().forEach((c) => counts.set(c.segment, (counts.get(c.segment) ?? 0) + 1));
    return counts;
  });

  protected filtered = computed(() => {
    const q = this.query().toLowerCase();
    const seg = this.segmentFilter();
    return this.store.customers().filter((c) => {
      if (seg !== 'all' && c.segment !== seg) return false;
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      if (q && !fullName.includes(q) && !c.email.toLowerCase().includes(q)) return false;
      return true;
    });
  });
}
