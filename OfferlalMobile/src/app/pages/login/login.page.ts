import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { CURRENT_USER } from '../../data/mock-data';

/**
 * Prototype-only auth, matching the pattern the web app had before it was
 * fixed there. The "demo credentials" hint and fillDemo() convenience
 * MUST be removed once this points at a real backend — a login hint like
 * this is a genuine trust issue for real users, not just a nicety.
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
  protected demoEmail = CURRENT_USER.email;

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
    this.error.set('');
    const ok = this.auth.login(this.email(), this.password());
    if (!ok) {
      this.error.set('No account found for that email address.');
      return;
    }
    this.router.navigateByUrl(this.returnUrl);
  }

  fillDemo(): void {
    this.email.set(this.demoEmail);
    this.password.set('anything');
  }
}
