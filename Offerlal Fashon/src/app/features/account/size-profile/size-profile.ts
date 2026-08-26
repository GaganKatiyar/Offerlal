import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { SizeProfile } from '../../../core/models';

@Component({
  selector: 'app-size-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './size-profile.html',
  styleUrl: '../dashboard/dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SizeProfilePage {
  protected auth = inject(AuthService);
  private customerService = inject(CustomerService);

  private existing = this.auth.currentUser()?.sizeProfile;

  protected bust = signal(this.existing?.bust ?? 0);
  protected waist = signal(this.existing?.waist ?? 0);
  protected hip = signal(this.existing?.hip ?? 0);
  protected shoulder = signal(this.existing?.shoulder ?? 0);
  protected height = signal(this.existing?.height ?? 0);
  protected blouseLength = signal(this.existing?.blouseLength ?? 0);
  protected sleeveLength = signal(this.existing?.sleeveLength ?? 0);
  protected lehengaLength = signal(this.existing?.lehengaLength ?? 0);
  protected preferredSize = signal(this.existing?.preferredSize ?? 'M');
  protected saved = signal(false);

  protected save(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    const profile: SizeProfile = {
      bust: this.bust(),
      waist: this.waist(),
      hip: this.hip(),
      shoulder: this.shoulder(),
      height: this.height(),
      blouseLength: this.blouseLength(),
      sleeveLength: this.sleeveLength(),
      lehengaLength: this.lehengaLength(),
      unit: 'in',
      preferredSize: this.preferredSize(),
      updatedAt: new Date().toISOString(),
    };
    this.customerService.saveSizeProfile(user.id, profile);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 3000);
  }
}
