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

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit(): void {
    if (!this.firstName() || !this.email()) return;
    this.auth.register(this.firstName(), this.lastName(), this.email(), this.phone());
    this.router.navigateByUrl('/tabs/account');
  }
}
