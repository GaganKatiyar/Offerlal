import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const tabsRoutes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      { path: 'home', loadComponent: () => import('./tab-home/tab-home.page').then((m) => m.TabHomePage) },
      { path: 'shop', loadComponent: () => import('./tab-shop/tab-shop.page').then((m) => m.TabShopPage) },
      { path: 'bag', loadComponent: () => import('./tab-bag/tab-bag.page').then((m) => m.TabBagPage) },
      { path: 'account', loadComponent: () => import('./tab-account/tab-account.page').then((m) => m.TabAccountPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
