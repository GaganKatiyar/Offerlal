import { Component, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
export class AddressesPage implements OnInit {
  protected showForm = signal(false);
  protected saving = signal(false);
  protected error = signal<string | null>(null);
  protected form = signal({ label: 'Home' as MobileAddress['label'], fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });

  constructor(protected addresses: AddressService) {
    addIcons({ addOutline, trashOutline, checkmarkCircle, radioButtonOff, closeOutline });
  }

  ngOnInit(): void {
    // The list lives on the server now, so it has to be fetched. Nothing called
    // this when the service seeded itself from demo data.
    this.addresses.load().subscribe({ next: () => undefined, error: () => undefined });
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
    if (!f.fullName || !f.line1 || !f.city || !f.pincode) {
      this.error.set('Please fill in the name, address, city and pincode.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // The form closes only once the server has accepted it. Closing first, as
    // this did, made a rejected address look saved.
    this.addresses.add({ ...f, isDefault: this.addresses.addresses().length === 0 }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const body = (err as HttpErrorResponse)?.error as { message?: string } | undefined;
        this.error.set(body?.message ?? 'Could not save that address.');
      },
    });
  }

  remove(id: string): void {
    this.addresses.remove(id).subscribe({ next: () => undefined, error: () => undefined });
  }

  setDefault(id: string): void {
    this.addresses.setDefault(id).subscribe({ next: () => undefined, error: () => undefined });
  }
}
