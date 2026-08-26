import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  open = input.required<boolean>();
  title = input<string>('');
  size = input<'sm' | 'md' | 'lg'>('md');
  closed = output<void>();

  protected close(): void {
    this.closed.emit();
  }
}
