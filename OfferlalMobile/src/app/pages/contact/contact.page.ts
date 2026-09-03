import { Component, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { callOutline, mailOutline, timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-contact',
  templateUrl: 'contact.page.html',
  styleUrls: ['contact.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon],
})
export class ContactPage {
  protected submitted = signal(false);

  constructor() {
    addIcons({ callOutline, mailOutline, timeOutline });
  }

  submit(): void {
    this.submitted.set(true);
  }
}
