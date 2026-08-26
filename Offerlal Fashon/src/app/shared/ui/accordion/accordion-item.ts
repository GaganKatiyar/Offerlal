import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-accordion-item',
  standalone: true,
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionItem {
  heading = input.required<string>();
  startOpen = input(false);
  protected isOpen = signal(this.startOpen());

  protected toggle(): void {
    this.isOpen.update((v) => !v);
  }
}
