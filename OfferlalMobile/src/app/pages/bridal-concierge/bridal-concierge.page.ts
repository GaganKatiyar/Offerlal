import { Component, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logoWhatsapp, videocamOutline, personOutline, cutOutline, chatbubbleOutline } from 'ionicons/icons';

const SERVICES = [
  { icon: 'person-outline', title: 'Bridal Consultation', desc: 'A one-on-one session to plan your full bridal wardrobe.' },
  { icon: 'cut-outline', title: 'Custom Fitting', desc: 'Precise measurements taken by our tailoring team.' },
  { icon: 'videocam-outline', title: 'Video Consultation', desc: 'Meet a stylist over video call from anywhere in India.' },
  { icon: 'logo-whatsapp', title: 'WhatsApp Consultation', desc: 'Quick questions answered directly over WhatsApp chat.' },
];

@Component({
  selector: 'app-bridal-concierge',
  templateUrl: 'bridal-concierge.page.html',
  styleUrls: ['bridal-concierge.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon],
})
export class BridalConciergePage {
  protected services = SERVICES;
  protected submitted = signal(false);

  constructor() {
    addIcons({ logoWhatsapp, videocamOutline, personOutline, cutOutline, chatbubbleOutline });
  }

  submit(): void {
    this.submitted.set(true);
  }
}
