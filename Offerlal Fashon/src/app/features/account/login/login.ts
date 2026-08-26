import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected mode = signal<'email' | 'otp'>('email');
  protected email = signal('');
  protected phone = signal('');
  protected otp = signal('');
  protected otpSent = signal(false);
  protected error = signal('');
  protected loading = signal(false);

  protected loginWithEmail(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email(), 'demo').subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/account']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  protected sendOtp(): void {
    if (!this.phone()) return;
    this.otpSent.set(true);
  }

  protected verifyOtp(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.loginWithOtp(this.phone(), this.otp()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/account']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
