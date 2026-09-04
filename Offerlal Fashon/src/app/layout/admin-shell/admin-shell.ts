import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface AdminNavItem {
  label: string;
  link: string;
  icon: string;
}

const NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', link: '/admin/dashboard', icon: '▦' },
  { label: 'Products', link: '/admin/products', icon: '👗' },
  { label: 'Inventory', link: '/admin/inventory', icon: '📦' },
  { label: 'Orders', link: '/admin/orders', icon: '🧾' },
  { label: 'Customers', link: '/admin/customers', icon: '👥' },
  { label: 'Coupons', link: '/admin/coupons', icon: '🏷️' },
  { label: 'Homepage', link: '/admin/content/homepage', icon: '🏠' },
  { label: 'Navigation', link: '/admin/navigation', icon: '🧭' },
];

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'admin-theme' },
})
export class AdminShell {
  protected navItems = NAV_ITEMS;
  private auth = inject(AuthService);
  private router = inject(Router);

  protected logout(): void {
    this.auth.logoutAdmin();
    this.router.navigate(['/admin/login']);
  }
}
