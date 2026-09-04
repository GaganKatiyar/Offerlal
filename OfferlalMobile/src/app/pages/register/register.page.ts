import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss'],
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent],
})
export class RegisterPage {
  protected firstName = signal('');
  protected lastName = signal('');
  protected email = signal('');
  protected phone = signal('');
  protected password = signal('');
  protected error = signal('');
  protected busy = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit(): void {
    if (this.busy()) return;

    // The form had no password field at all: register() created a local
    // session from whatever was typed. Against a real API a password is
    // required, and checking length here saves a round trip for the most
    // common rejection.
    if (!this.firstName().trim() || !this.email().trim() || !this.password()) {
      this.error.set('Please fill in your name, email and a password.');
      return;
    }
    if (this.password().length < 8) {
      this.error.set('Passwords need to be at least 8 characters.');
      return;
    }

    this.error.set('');
    this.busy.set(true);

    this.auth
      .register(this.firstName(), this.lastName(), this.email(), this.phone(), this.password())
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.router.navigateByUrl('/tabs/account');
        },
        error: (err: unknown) => {
          this.busy.set(false);
          const e = err as HttpErrorResponse;
          const body = e?.error as { message?: string } | undefined;
          if (e?.status === 0) {
            this.error.set("Couldn't reach the server. Check your connection.");
          } else {
            // The API says when an address is already registered, and that is
            // worth passing through: it tells the customer to sign in instead.
            this.error.set(body?.message ?? 'Could not create your account. Please try again.');
          }
        },
      });
  }
}
