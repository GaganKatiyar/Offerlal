import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

/**
 * Reset a forgotten password, in one screen with two steps.
 *
 * Step 1 asks for the email and always shows the same confirmation, whether or
 * not that address has an account — telling the truth here would turn this
 * form into a way to test which emails are registered, which is exactly what
 * the server's own response is worded to avoid.
 *
 * Step 2 takes the code from that email plus a new password. There is no
 * separate "reset password" route: splitting them would mean carrying the
 * email across a navigation, and a code pasted into the wrong screen is a
 * worse failure mode than one field too many on this one.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  private router = inject(Router);

  protected step = signal<'request' | 'reset'>('request');
  protected email = signal('');
  protected code = signal('');
  protected newPassword = signal('');

  protected loading = signal(false);
  protected message = signal('');
  protected error = signal('');

  protected requestCode(): void {
    if (this.loading() || !this.email().trim()) return;

    this.loading.set(true);
    this.error.set('');

    this.http.post<{ message: string }>(`${this.base}/auth/forgot-password`, { email: this.email() }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(res.message);
        this.step.set('reset');
      },
      error: () => {
        this.loading.set(false);
        // The endpoint itself only fails on a malformed request, never on "no
        // such account" - that case still returns 200 with the generic
        // message. A genuine failure here means the server is unreachable.
        this.error.set('Could not reach the server. Please try again.');
      },
    });
  }

  protected resetPassword(): void {
    if (this.loading() || !this.code().trim() || !this.newPassword()) return;

    if (this.newPassword().length < 8) {
      this.error.set('Passwords need to be at least 8 characters.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.message.set('');

    this.http
      .post<{ message: string }>(`${this.base}/auth/reset-password`, {
        email: this.email(),
        code: this.code(),
        newPassword: this.newPassword(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          // Sign-in is the natural next step, and every existing session was
          // just revoked server-side - staying here with a filled-in form
          // reads as though nothing happened.
          this.router.navigate(['/login'], { queryParams: { reset: '1' } });
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const e = err as HttpErrorResponse;
          const body = e?.error as { message?: string } | undefined;
          this.error.set(body?.message ?? 'Could not reset your password. Please try again.');
        },
      });
  }
}
