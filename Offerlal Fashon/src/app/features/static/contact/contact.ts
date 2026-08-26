import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  protected name = signal('');
  protected email = signal('');
  protected message = signal('');
  protected submitted = signal(false);

  protected submit(): void {
    if (!this.name() || !this.email() || !this.message()) return;
    this.submitted.set(true);
  }
}
