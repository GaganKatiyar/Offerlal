import { Component, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonToast } from '@ionic/angular';
import { SizeProfileService } from '../../services/size-profile.service';
import { SizeProfile } from '../../data/mock-data';

@Component({
  selector: 'app-size-profile',
  templateUrl: 'size-profile.page.html',
  styleUrls: ['size-profile.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonToast],
})
export class SizeProfilePage {
  protected form = signal<SizeProfile>(
    this.sizeProfileService.profile() ?? {
      bust: 0,
      waist: 0,
      hip: 0,
      shoulder: 0,
      height: 0,
      preferredSize: '',
      unit: 'in',
    },
  );
  protected saved = signal(false);

  constructor(private sizeProfileService: SizeProfileService) {}

  update<K extends keyof SizeProfile>(key: K, value: SizeProfile[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save(): void {
    this.sizeProfileService.save(this.form());
    this.saved.set(true);
  }
}
