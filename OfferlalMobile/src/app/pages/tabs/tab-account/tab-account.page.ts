import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  receiptOutline,
  heartOutline,
  locationOutline,
  resizeOutline,
  chatbubbleEllipsesOutline,
  helpCircleOutline,
  chevronForward,
  logOutOutline,
} from 'ionicons/icons';
import { CURRENT_USER } from '../../../data/mock-data';

@Component({
  selector: 'app-tab-account',
  templateUrl: 'tab-account.page.html',
  styleUrls: ['tab-account.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
})
export class TabAccountPage {
  protected user = CURRENT_USER;

  protected menu = [
    { icon: 'receipt-outline', label: 'My Orders' },
    { icon: 'heart-outline', label: 'Wishlist' },
    { icon: 'location-outline', label: 'Saved Addresses' },
    { icon: 'resize-outline', label: 'Size Profile' },
    { icon: 'chatbubble-ellipses-outline', label: 'Bridal Concierge' },
    { icon: 'help-circle-outline', label: 'Help & FAQs' },
  ];

  constructor() {
    addIcons({
      receiptOutline,
      heartOutline,
      locationOutline,
      resizeOutline,
      chatbubbleEllipsesOutline,
      helpCircleOutline,
      chevronForward,
      logOutOutline,
    });
  }
}
