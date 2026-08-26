import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(text: string, durationMs = 2600): void {
    const id = ++this.nextId;
    this.messages.update((list) => [...list, { id, text }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.messages.update((list) => list.filter((m) => m.id !== id));
  }
}
