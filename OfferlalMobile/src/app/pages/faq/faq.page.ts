import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
} from '@ionic/angular';
import { FAQS } from '../../data/mock-data';

@Component({
  selector: 'app-faq',
  templateUrl: 'faq.page.html',
  styleUrls: ['faq.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
  ],
})
export class FaqPage {
  protected faqs = FAQS;
}
