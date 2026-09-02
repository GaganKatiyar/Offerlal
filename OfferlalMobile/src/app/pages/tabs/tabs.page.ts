import { Component } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { home, homeOutline, gridOutline, grid, bagOutline, bag, personOutline, person } from 'ionicons/icons';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonBadge],
})
export class TabsPage {
  constructor(protected cart: CartService) {
    addIcons({ home, homeOutline, gridOutline, grid, bagOutline, bag, personOutline, person });
  }
}
