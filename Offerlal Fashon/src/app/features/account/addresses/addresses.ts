import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { Address } from '../../../core/models';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './addresses.html',
  styleUrl: '../dashboard/dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Addresses {
  protected auth = inject(AuthService);
  private customerService = inject(CustomerService);

  protected showForm = signal(false);
  protected label = signal<'Home' | 'Work' | 'Other'>('Home');
  protected fullName = signal('');
  protected phone = signal('');
  protected line1 = signal('');
  protected city = signal('');
  protected state = signal('');
  protected pincode = signal('');
  protected isDefault = signal(false);

  protected addAddress(): void {
    const user = this.auth.currentUser();
    if (!user || !this.fullName() || !this.line1() || !this.city() || !this.pincode()) return;
    const address: Address = {
      id: `addr-${Date.now()}`,
      label: this.label(),
      fullName: this.fullName(),
      phone: this.phone(),
      line1: this.line1(),
      city: this.city(),
      state: this.state(),
      pincode: this.pincode(),
      isDefault: this.isDefault(),
    };
    this.customerService.addAddress(user.id, address);
    this.showForm.set(false);
    this.fullName.set('');
    this.line1.set('');
    this.city.set('');
    this.state.set('');
    this.pincode.set('');
  }

  protected removeAddress(addressId: string): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.customerService.removeAddress(user.id, addressId);
  }
}
