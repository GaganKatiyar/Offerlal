import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  receiptOutline,
  heartOutline,
  locationOutline,
  resizeOutline,
  chatbubbleEllipsesOutline,
  helpCircleOutline,
  informationCircleOutline,
  callOutline,
  chevronForward,
  logOutOutline,
  logInOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tab-account',
  templateUrl: 'tab-account.page.html',
  styleUrls: ['tab-account.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
})
export class TabAccountPage {
  protected menu = [
    { icon: 'receipt-outline', label: 'My Orders', route: '/account/orders' },
    { icon: 'heart-outline', label: 'Wishlist', route: '/wishlist' },
    { icon: 'location-outline', label: 'Saved Addresses', route: '/account/addresses' },
    { icon: 'resize-outline', label: 'Size Profile', route: '/account/size-profile' },
    { icon: 'chatbubble-ellipses-outline', label: 'Bridal Concierge', route: '/bridal-concierge' },
    { icon: 'help-circle-outline', label: 'Help & FAQs', route: '/faq' },
    { icon: 'information-circle-outline', label: 'About Us', route: '/about' },
    { icon: 'call-outline', label: 'Contact Us', route: '/contact' },
  ];

  constructor(
    protected auth: AuthService,
    private router: Router,
  ) {
    addIcons({
      receiptOutline,
      heartOutline,
      locationOutline,
      resizeOutline,
      chatbubbleEllipsesOutline,
      helpCircleOutline,
      informationCircleOutline,
      callOutline,
      chevronForward,
      logOutOutline,
      logInOutline,
    });
  }

  logout(): void {
    this.auth.logout();
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/tabs/account' } });
  }
}
