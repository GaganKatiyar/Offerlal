import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline } from 'ionicons/icons';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

/**
 * Sign in, against the real API.
 *
 * The demo hint and fillDemo() that used to live here are gone, as the note on
 * this class said they had to be the moment there was a real backend: they
 * named a real account and told anyone reading that any password would do.
 */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonIcon],
})
export class LoginPage {
  protected email = signal('');
  protected password = signal('');
  protected error = signal('');
  protected busy = signal(false);

  private returnUrl = '/tabs/account';

  constructor(
    private auth: AuthService,
    private router: Router,
    route: ActivatedRoute,
  ) {
    addIcons({ mailOutline, lockClosedOutline });
    this.returnUrl = route.snapshot.queryParamMap.get('returnUrl') ?? '/tabs/account';
  }

  submit(): void {
    if (this.busy()) return;

    const email = this.email().trim();
    if (!email || !this.password()) {
      this.error.set('Enter your email and password.');
      return;
    }

    this.error.set('');
    this.busy.set(true);

    this.auth.login(email, this.password()).subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(describeAuthError(err));
      },
    });
  }
}

function describeAuthError(err: unknown): string {
  const e = err as HttpErrorResponse;
  // 401 is deliberately vague about WHICH half was wrong: saying "no account
  // with that email" turns the login form into a way to test whether an
  // address is registered.
  if (e?.status === 401) return 'Incorrect email or password.';
  if (e?.status === 0) return "Couldn't reach the server. Check your connection.";
  const body = e?.error as { message?: string } | undefined;
  return body?.message ?? 'Could not sign in. Please try again.';
}
