import { Routes } from '@angular/router';
import { AdminShell } from '../layout/admin-shell/admin-shell';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShell,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/admin-dashboard').then((m) => m.AdminDashboard), title: 'Admin Dashboard | Offerlal Fashion' },
      { path: 'products', loadComponent: () => import('./products/product-list/product-list').then((m) => m.ProductList), title: 'Products | Admin' },
      { path: 'products/new', loadComponent: () => import('./products/product-form/product-form').then((m) => m.ProductForm), title: 'Add Product | Admin' },
      { path: 'products/:id/edit', loadComponent: () => import('./products/product-form/product-form').then((m) => m.ProductForm), title: 'Edit Product | Admin' },
      { path: 'inventory', loadComponent: () => import('./inventory/stock-table/stock-table').then((m) => m.StockTable), title: 'Inventory | Admin' },
      { path: 'orders', loadComponent: () => import('./orders/order-list/order-list').then((m) => m.AdminOrderList), title: 'Orders | Admin' },
      { path: 'orders/:id', loadComponent: () => import('./orders/order-detail/order-detail').then((m) => m.AdminOrderDetail), title: 'Order Details | Admin' },
      { path: 'customers', loadComponent: () => import('./customers/customer-list/customer-list').then((m) => m.CustomerList), title: 'Customers | Admin' },
      { path: 'customers/:id', loadComponent: () => import('./customers/customer-detail/customer-detail').then((m) => m.CustomerDetail), title: 'Customer Details | Admin' },
      { path: 'navigation', loadComponent: () => import('./navigation/nav-editor').then((m) => m.NavEditor), title: 'Navigation | Admin' },
      { path: 'content/homepage', loadComponent: () => import('./content/homepage-editor').then((m) => m.HomepageEditor), title: 'Homepage | Admin' },
      { path: 'coupons', loadComponent: () => import('./coupons/coupon-list/coupon-list').then((m) => m.CouponList), title: 'Coupons | Admin' },
      { path: 'coupons/new', loadComponent: () => import('./coupons/coupon-form/coupon-form').then((m) => m.CouponForm), title: 'Add Coupon | Admin' },
      { path: 'coupons/:id/edit', loadComponent: () => import('./coupons/coupon-form/coupon-form').then((m) => m.CouponForm), title: 'Edit Coupon | Admin' },
    ],
  },
];
