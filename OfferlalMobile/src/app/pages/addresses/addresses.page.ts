import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, checkmarkCircle, radioButtonOff, closeOutline } from 'ionicons/icons';
import { AddressService } from '../../services/address.service';
import { MobileAddress } from '../../data/mock-data';

@Component({
  selector: 'app-addresses',
  templateUrl: 'addresses.page.html',
  styleUrls: ['addresses.page.scss'],
  standalone: true,
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonIcon],
})
export class AddressesPage {
  protected showForm = signal(false);
  protected form = signal({ label: 'Home' as MobileAddress['label'], fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });

  constructor(protected addresses: AddressService) {
    addIcons({ addOutline, trashOutline, checkmarkCircle, radioButtonOff, closeOutline });
  }

  openForm(): void {
    this.form.set({ label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  updateForm<K extends keyof ReturnType<typeof this.form>>(key: K, value: any): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    const f = this.form();
    if (!f.fullName || !f.line1 || !f.city || !f.pincode) return;
    this.addresses.add({ ...f, isDefault: this.addresses.addresses().length === 0 });
    this.showForm.set(false);
  }

  remove(id: string): void {
    this.addresses.remove(id);
  }

  setDefault(id: string): void {
    this.addresses.setDefault(id);
  }
}
