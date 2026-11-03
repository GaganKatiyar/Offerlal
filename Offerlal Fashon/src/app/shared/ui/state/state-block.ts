import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type StateKind = 'loading' | 'empty' | 'error' | 'not-found';

/**
 * The non-content state of a screen: loading, empty, failed, or missing.
 *
 * These four were previously conflated. The clearest example is the order
 * detail page, whose template was `@if (order()) {} @else { "Order not found" }`
 * — so a slow network and a genuinely missing order looked identical, and a
 * customer whose connection dropped was told their order did not exist.
 *
 * Distinguishing them matters because the right response differs: wait, go
 * shopping, retry, or go back. An error state without a retry is just a
 * dead end.
 */
@Component({
  selector: 'app-state-block',
  standalone: true,
  template: `
    <div
      class="state"
      [class]="'state--' + kind()"
      [attr.role]="kind() === 'error' ? 'alert' : null"
      [attr.aria-busy]="kind() === 'loading' ? 'true' : null"
    >
      <p class="state__title">{{ title() || defaultTitle() }}</p>

      @if (message()) {
        <p class="state__message">{{ message() }}</p>
      }

      @if (kind() === 'error') {
        <button type="button" class="btn btn-outline state__retry" (click)="retry.emit()">
          {{ retryLabel() }}
        </button>
      }

      <!-- Somewhere for a caller to put "Start shopping" on an empty state. -->
      <ng-content />
    </div>
  `,
  styleUrl: './state-block.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateBlock {
  kind = input<StateKind>('loading');
  title = input<string>('');
  message = input<string>('');
  retryLabel = input('Try again');

  retry = output<void>();

  /**
   * Deliberately vague about cause on `error`.
   *
   * The customer cannot act on whether it was a 500 or a dropped connection,
   * and the honest, useful thing is to offer the retry.
   */
  protected defaultTitle = computed(() => {
    switch (this.kind()) {
      case 'loading':
        return 'Loading…';
      case 'empty':
        return 'Nothing here yet';
      case 'not-found':
        return "We couldn't find that";
      case 'error':
        return "That didn't load";
    }
  });
}
