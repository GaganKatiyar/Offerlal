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
  protected password = signal('');
  protected phone = signal('');
  protected otp = signal('');
  protected otpSent = signal(false);
  protected error = signal('');
  protected loading = signal(false);

  /**
   * Signs in with what was actually typed.
   *
   * The password box on this form was bound to nothing: it accepted input,
   * discarded it, and the literal string 'demo' was sent instead. That was
   * invisible while the server accepted any password, and became a login that
   * could not work the moment it did not.
   */
  protected loginWithEmail(): void {
    if (this.loading()) return;

    if (!this.email().trim() || !this.password()) {
      this.error.set('Enter your email and password.');
      return;
    }

    this.error.set('');
    this.loading.set(true);

    this.auth.login(this.email(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/account']);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(describeAuthError(err));
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
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(describeAuthError(err));
      },
    });
  }
}

function describeAuthError(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string }; message?: string };

  // 401 stays vague about WHICH half was wrong: "no account with that email"
  // turns the login form into a way to test whether an address is registered.
  if (e?.status === 401) return 'Incorrect email or password.';
  if (e?.status === 0) return 'Could not reach the server. Please try again.';
  if (e?.error?.message) return e.error.message;

  // A plain Error (the OTP path) carries a message worth showing; an
  // HttpErrorResponse's is the raw "Http failure response for <url>", which is
  // not something to put in front of a customer.
  if (e?.message && !e.message.startsWith('Http failure')) return e.message;
  return 'Could not sign in. Please try again.';
}
