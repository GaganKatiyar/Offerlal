import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../shared/components/header/header';
import { Footer } from '../../shared/components/footer/footer';
import { WhatsappFloatButton } from '../../shared/components/whatsapp-float-button/whatsapp-float-button';
import { ToastContainer } from '../../shared/components/toast/toast-container';
import { CartDrawer } from '../../features/cart/cart-drawer/cart-drawer';
import { QuickViewModal } from '../../shared/components/quick-view-modal/quick-view-modal';

@Component({
  selector: 'app-storefront-shell',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, WhatsappFloatButton, ToastContainer, CartDrawer, QuickViewModal],
  templateUrl: './storefront-shell.html',
  styleUrl: './storefront-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontShell {}
