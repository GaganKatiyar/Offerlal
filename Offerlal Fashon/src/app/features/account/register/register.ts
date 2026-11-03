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

  protected name = signal('');
  protected email = signal('');
  protected phone = signal('');
  protected password = signal('');
  protected loading = signal(false);
  protected error = signal('');

  protected submit(): void {
    if (this.loading()) return;

    // The form had no password field at all; the account was created from
    // whatever was typed and any password signed you in afterwards. Checking
    // the length here saves a round trip on the most common rejection.
    if (!this.name().trim() || !this.email() || !this.phone() || !this.password()) {
      this.error.set('Please fill in all required fields.');
      return;
    }
    if (this.password().length < 8) {
      this.error.set('Passwords need to be at least 8 characters.');
      return;
    }

    this.error.set('');
    this.loading.set(true);

    this.auth
      .register({
        // The API stores first and last separately, so the single field is
        // split on the last space: everything before it is the given name(s).
        // A one-word name keeps an empty surname rather than duplicating it.
        ...splitName(this.name()),
        email: this.email(),
        phone: this.phone(),
        password: this.password(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/account']);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          const e = err as { status?: number; error?: { message?: string } };
          if (e?.status === 0) {
            this.error.set('Could not reach the server. Please try again.');
          } else {
            // The API says when an address is already registered, and that is
            // worth passing through: it tells the customer to sign in instead.
            this.error.set(e?.error?.message ?? 'Could not create your account. Please try again.');
          }
        },
      });
  }
}

/** Splits a single typed name into the first/last pair the API expects. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}
