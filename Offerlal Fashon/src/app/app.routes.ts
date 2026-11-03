import { Routes } from '@angular/router';
import { StorefrontShell } from './layout/storefront-shell/storefront-shell';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Admin is matched before the storefront. The shell below has path '', which
  // matches every URL as a prefix, so once the catch-all lives inside it any
  // /admin URL would be swallowed as "not found" before these were considered.
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/admin-login').then((m) => m.AdminLogin),
    title: 'Admin Login | Offerlal Fashion',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    component: StorefrontShell,
    children: [
      { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home), title: 'Offerlal Fashion | Premium Indian Lehengas & Occasion Wear' },
      { path: 'new-arrivals', loadComponent: () => import('./features/plp/plp').then((m) => m.Plp), data: { mode: 'new-arrivals' }, title: 'New Arrivals | Offerlal Fashion' },
      { path: 'shop', loadComponent: () => import('./features/plp/plp').then((m) => m.Plp), data: { mode: 'all' }, title: 'Shop All | Offerlal Fashion' },
      { path: 'sale', loadComponent: () => import('./features/plp/plp').then((m) => m.Plp), data: { mode: 'sale' }, title: 'Sale | Offerlal Fashion' },
      { path: 'bridal', loadComponent: () => import('./features/bridal-collection/bridal-collection').then((m) => m.BridalCollection), title: 'The Bridal Edit | Offerlal Fashion' },
      { path: 'collections', loadComponent: () => import('./features/shop-by-category/shop-by-category').then((m) => m.ShopByCategory), title: 'Collections | Offerlal Fashion' },
      { path: 'category/:slug', loadComponent: () => import('./features/plp/plp').then((m) => m.Plp), data: { mode: 'category' }, title: 'Shop | Offerlal Fashion' },
      { path: 'occasion', loadComponent: () => import('./features/shop-by-occasion/shop-by-occasion').then((m) => m.ShopByOccasion), title: 'Shop by Occasion | Offerlal Fashion' },
      { path: 'occasion/:slug', loadComponent: () => import('./features/plp/plp').then((m) => m.Plp), data: { mode: 'occasion' }, title: 'Shop by Occasion | Offerlal Fashion' },
      { path: 'product/:slug', loadComponent: () => import('./features/pdp/pdp').then((m) => m.Pdp) },
      { path: 'cart', loadComponent: () => import('./features/cart/cart-page/cart-page').then((m) => m.CartPage), title: 'Your Bag | Offerlal Fashion' },
      // Checkout is a three-step flow with the step in the URL, so the browser's
      // own back button moves between steps instead of leaving checkout, and a
      // step can be linked to. A bare /checkout starts at the beginning.
      { path: 'checkout', redirectTo: 'checkout/address', pathMatch: 'full' },
      { path: 'checkout/confirmation/:orderNumber', loadComponent: () => import('./features/checkout/order-confirmation/order-confirmation').then((m) => m.OrderConfirmation), title: 'Order Confirmed | Offerlal Fashion' },
      { path: 'checkout/:step', loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout), title: 'Checkout | Offerlal Fashion' },
      { path: 'search', loadComponent: () => import('./features/search/search').then((m) => m.Search), title: 'Search | Offerlal Fashion' },
      { path: 'track-order', loadComponent: () => import('./features/order-tracking/order-tracking').then((m) => m.OrderTracking), title: 'Track Your Order | Offerlal Fashion' },
      { path: 'track-order/:orderNumber', loadComponent: () => import('./features/order-tracking/order-tracking').then((m) => m.OrderTracking), title: 'Track Your Order | Offerlal Fashion' },
      { path: 'bridal-concierge', loadComponent: () => import('./features/bridal-concierge/bridal-concierge').then((m) => m.BridalConcierge), title: 'Bridal Concierge | Offerlal Fashion' },
      { path: 'about', loadComponent: () => import('./features/static/about/about').then((m) => m.About), title: 'About Us | Offerlal Fashion' },
      { path: 'contact', loadComponent: () => import('./features/static/contact/contact').then((m) => m.Contact), title: 'Contact Us | Offerlal Fashion' },
      { path: 'faq', loadComponent: () => import('./features/static/faq/faq').then((m) => m.Faq), title: 'FAQs | Offerlal Fashion' },
      { path: 'login', loadComponent: () => import('./features/account/login/login').then((m) => m.Login), title: 'Login | Offerlal Fashion' },
      { path: 'register', loadComponent: () => import('./features/account/register/register').then((m) => m.Register), title: 'Create Account | Offerlal Fashion' },
      { path: 'forgot-password', loadComponent: () => import('./features/account/forgot-password/forgot-password').then((m) => m.ForgotPassword), title: 'Reset Password | Offerlal Fashion' },
      {
        path: 'account',
        canActivate: [authGuard],
        children: [
          { path: '', loadComponent: () => import('./features/account/dashboard/dashboard').then((m) => m.Dashboard), title: 'My Account | Offerlal Fashion' },
          { path: 'orders', loadComponent: () => import('./features/account/orders/order-list/order-list').then((m) => m.OrderList), title: 'My Orders | Offerlal Fashion' },
          { path: 'orders/:orderNumber', loadComponent: () => import('./features/account/orders/order-detail/order-detail').then((m) => m.OrderDetail), title: 'Order Details | Offerlal Fashion' },
          { path: 'wishlist', loadComponent: () => import('./features/account/wishlist/wishlist').then((m) => m.Wishlist), title: 'My Wishlist | Offerlal Fashion' },
          { path: 'addresses', loadComponent: () => import('./features/account/addresses/addresses').then((m) => m.Addresses), title: 'Saved Addresses | Offerlal Fashion' },
          { path: 'size-profile', loadComponent: () => import('./features/account/size-profile/size-profile').then((m) => m.SizeProfilePage), title: 'Size Profile | Offerlal Fashion' },
        ],
      },

      // Inside the shell, not beside it. Rendered as a sibling the 404 had no
      // header and no footer, so the one page a lost visitor is guaranteed to
      // reach was the one page with no way to leave.
      {
        path: '**',
        loadComponent: () => import('./features/static/not-found/not-found').then((m) => m.NotFound),
        title: 'Page Not Found | Offerlal Fashion',
      },
    ],
  },
];
