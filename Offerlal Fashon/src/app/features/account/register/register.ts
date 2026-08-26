import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected firstName = signal('');
  protected lastName = signal('');
  protected email = signal('');
  protected phone = signal('');
  protected city = signal('');
  protected state = signal('');
  protected loading = signal(false);
  protected error = signal('');

  protected submit(): void {
    if (!this.firstName() || !this.email() || !this.phone()) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    this.loading.set(true);
    this.auth
      .register({
        firstName: this.firstName(),
        lastName: this.lastName(),
        email: this.email(),
        phone: this.phone(),
        city: this.city(),
        state: this.state(),
      })
      .subscribe(() => {
        this.loading.set(false);
        this.router.navigate(['/account']);
      });
  }
}
