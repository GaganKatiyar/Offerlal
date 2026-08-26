import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found-page">
      <h1>404</h1>
      <p>We couldn't find the page you're looking for.</p>
      <a routerLink="/" class="btn btn-primary">Back to Home</a>
    </div>
  `,
  styles: `
    .not-found-page {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-10);
    }
    h1 {
      font-size: var(--font-size-4xl);
      color: var(--brand-primary);
    }
    p {
      color: var(--text-secondary);
      margin-bottom: var(--space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
