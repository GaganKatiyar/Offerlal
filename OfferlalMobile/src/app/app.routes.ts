import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full',
  },
  {
    path: 'tabs',
    loadChildren: () => import('./pages/tabs/tabs.routes').then((m) => m.tabsRoutes),
  },
  {
    path: 'product/:slug',
    loadComponent: () => import('./pages/product-detail/product-detail.page').then((m) => m.ProductDetailPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./pages/wishlist/wishlist.page').then((m) => m.WishlistPage),
    canActivate: [authGuard],
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.page').then((m) => m.CheckoutPage),
    canActivate: [authGuard],
  },
  {
    path: 'order-confirmation/:orderNumber',
    loadComponent: () => import('./pages/order-confirmation/order-confirmation.page').then((m) => m.OrderConfirmationPage),
    canActivate: [authGuard],
  },
  {
    path: 'account/orders',
    loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage),
    canActivate: [authGuard],
  },
  {
    path: 'account/orders/:orderNumber',
    loadComponent: () => import('./pages/order-detail/order-detail.page').then((m) => m.OrderDetailPage),
    canActivate: [authGuard],
  },
  {
    path: 'account/addresses',
    loadComponent: () => import('./pages/addresses/addresses.page').then((m) => m.AddressesPage),
    canActivate: [authGuard],
  },
  {
    path: 'account/size-profile',
    loadComponent: () => import('./pages/size-profile/size-profile.page').then((m) => m.SizeProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'bridal-concierge',
    loadComponent: () => import('./pages/bridal-concierge/bridal-concierge.page').then((m) => m.BridalConciergePage),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.page').then((m) => m.AboutPage),
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.page').then((m) => m.ContactPage),
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq.page').then((m) => m.FaqPage),
  },
];
