import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-drawer',
  standalone: true,
  templateUrl: './drawer.html',
  styleUrl: './drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  open = input.required<boolean>();
  side = input<'left' | 'right'>('right');
  title = input<string>('');
  closed = output<void>();

  protected close(): void {
    this.closed.emit();
  }
}
