import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLogin {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected username = signal('');
  protected password = signal('');
  protected error = signal('');
  protected loading = signal(false);

  protected login(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.loginAdmin(this.username(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
