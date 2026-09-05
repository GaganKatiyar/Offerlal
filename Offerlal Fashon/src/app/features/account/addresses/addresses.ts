import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AccountApiService } from '../../../core/services/account-api.service';

/**
 * Saved addresses, from the server.
 *
 * These were written into DemoDataStoreService, which resets on reload — so a
 * customer could add an address, refresh, and find it gone. They now persist,
 * and are the same list the app sees.
 */
@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './addresses.html',
  styleUrl: '../dashboard/dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Addresses implements OnInit {
  protected auth = inject(AuthService);
  private api = inject(AccountApiService);

  protected addresses = this.api.addresses;
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal<string | null>(null);

  protected showForm = signal(false);
  protected label = signal<'Home' | 'Work' | 'Other'>('Home');
  protected fullName = signal('');
  protected phone = signal('');
  protected line1 = signal('');
  protected city = signal('');
  protected state = signal('');
  protected pincode = signal('');
  protected isDefault = signal(false);

  ngOnInit(): void {
    this.api.loadAddresses().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  protected addAddress(): void {
    if (this.saving()) return;

    if (!this.fullName() || !this.line1() || !this.city() || !this.pincode()) {
      this.error.set('Please fill in the name, address, city and pincode.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api
      .addAddress({
        label: this.label(),
        fullName: this.fullName(),
        phone: this.phone(),
        line1: this.line1(),
        line2: null,
        city: this.city(),
        state: this.state(),
        pincode: this.pincode(),
        isDefault: this.isDefault(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          // The form closes only once the server has accepted it. Closing first
          // made a rejected address look saved.
          this.showForm.set(false);
          this.resetForm();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          const body = (err as { error?: { message?: string } })?.error;
          this.error.set(body?.message ?? 'Could not save that address.');
        },
      });
  }

  protected removeAddress(addressId: string): void {
    this.api.deleteAddress(addressId).subscribe({
      next: () => undefined,
      error: () => this.error.set('Could not remove that address.'),
    });
  }

  protected makeDefault(addressId: string): void {
    this.api.setDefaultAddress(addressId).subscribe({
      next: () => undefined,
      error: () => this.error.set('Could not change the default address.'),
    });
  }

  private resetForm(): void {
    this.fullName.set('');
    this.phone.set('');
    this.line1.set('');
    this.city.set('');
    this.state.set('');
    this.pincode.set('');
    this.isDefault.set(false);
  }
}
