import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DemoDataStoreService } from '../../core/services/demo-data-store.service';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

const CHART_COLORS = ['#9c2547', '#0a9186', '#c79a46', '#1f8f5a', '#5a4ba0', '#b85a2a', '#d1a22e', '#c15b8c'];
const STATUS_COLORS: Record<string, string> = {
  Delivered: '#0ca30c',
  Shipped: '#0a9186',
  OutForDelivery: '#5a4ba0',
  Processing: '#fab219',
  Customized: '#fab219',
  Confirmed: '#c79a46',
  Placed: '#8a8177',
  Packed: '#1f8f5a',
  Cancelled: '#d03b3b',
  ReturnRequested: '#ec835a',
  Returned: '#ec835a',
  Exchanged: '#b85a2a',
  Refunded: '#d03b3b',
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [BaseChartDirective, InrCurrencyPipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private store = inject(DemoDataStoreService);

  protected orders = computed(() => this.store.orders());
  protected products = computed(() => this.store.products());
  protected customers = computed(() => this.store.customers());

  protected validOrders = computed(() => this.orders().filter((o) => o.status !== 'Cancelled'));

  protected totalRevenue = computed(() => this.validOrders().reduce((sum, o) => sum + o.total, 0));
  protected totalOrders = computed(() => this.orders().length);
  protected totalCustomers = computed(() => this.customers().length);
  protected totalProducts = computed(() => this.products().length);
  protected avgOrderValue = computed(() => (this.validOrders().length ? Math.round(this.totalRevenue() / this.validOrders().length) : 0));
  protected pendingOrders = computed(() => this.orders().filter((o) => ['Placed', 'Confirmed', 'Processing', 'Customized', 'Packed'].includes(o.status)).length);
  protected returnsCount = computed(() => this.orders().filter((o) => ['ReturnRequested', 'Returned', 'Exchanged', 'Refunded'].includes(o.status)).length);
  protected lowStockCount = computed(() => this.products().filter((p) => p.stockStatus === 'low-stock' || p.stockStatus === 'out-of-stock').length);
  protected conversionRate = computed(() => {
    const visits = this.totalCustomers() * 6.4;
    return visits ? Math.min(100, (this.validOrders().length / visits) * 100) : 0;
  });

  // Revenue trend (last 7 months)
  protected revenueTrendData = computed<ChartData<'line'>>(() => {
    const months = this.lastNMonths(7);
    const values = months.map(({ year, month }) =>
      this.validOrders()
        .filter((o) => {
          const d = new Date(o.placedAt);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, o) => sum + o.total, 0),
    );
    return {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: 'Revenue',
          data: values,
          borderColor: '#9c2547',
          backgroundColor: 'rgba(156,37,71,0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#9c2547',
        },
      ],
    };
  });

  protected lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') } } },
  };

  // Orders by status (donut)
  protected orderStatusData = computed<ChartData<'doughnut'>>(() => {
    const counts = new Map<string, number>();
    this.orders().forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    const labels = Array.from(counts.keys());
    return {
      labels,
      datasets: [{ data: labels.map((l) => counts.get(l)!), backgroundColor: labels.map((l) => STATUS_COLORS[l] ?? '#8a8177') }],
    };
  });

  protected doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
  };

  // Top categories by sales (bar)
  protected topCategoriesData = computed<ChartData<'bar'>>(() => {
    const byCategory = new Map<string, number>();
    this.validOrders().forEach((o) =>
      o.items.forEach((item) => {
        const product = this.products().find((p) => p.id === item.productId);
        const cat = this.store.categories().find((c) => c.id === product?.categoryId);
        const key = cat?.name ?? 'Other';
        byCategory.set(key, (byCategory.get(key) ?? 0) + item.lineTotal);
      }),
    );
    const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: sorted.map(([k]) => k),
      datasets: [{ label: 'Sales', data: sorted.map(([, v]) => v), backgroundColor: CHART_COLORS }],
    };
  });

  protected barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { ticks: { callback: (v) => '₹' + Number(v).toLocaleString('en-IN') } } },
  };

  // Sales by city
  protected salesByCityData = computed<ChartData<'bar'>>(() => {
    const byCity = new Map<string, number>();
    this.validOrders().forEach((o) => byCity.set(o.shippingAddress.city, (byCity.get(o.shippingAddress.city) ?? 0) + o.total));
    const sorted = Array.from(byCity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      labels: sorted.map(([k]) => k),
      datasets: [{ label: 'Sales', data: sorted.map(([, v]) => v), backgroundColor: '#9c2547' }],
    };
  });

  // Top products by units sold
  protected topProducts = computed(() => {
    const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
    this.validOrders().forEach((o) =>
      o.items.forEach((item) => {
        const entry = byProduct.get(item.productId) ?? { name: item.name, units: 0, revenue: 0 };
        entry.units += item.quantity;
        entry.revenue += item.lineTotal;
        byProduct.set(item.productId, entry);
      }),
    );
    return Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  });

  private lastNMonths(n: number): { year: number; month: number; label: string }[] {
    const now = new Date('2026-08-16');
    const result = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('en-IN', { month: 'short' }) });
    }
    return result;
  }
}
