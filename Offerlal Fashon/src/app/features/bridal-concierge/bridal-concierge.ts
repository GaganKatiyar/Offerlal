import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface ServiceOption {
  id: string;
  title: string;
  description: string;
}

const SERVICES: ServiceOption[] = [
  { id: 'consultation', title: 'Bridal Consultation', description: 'A one-on-one session to plan your full bridal wardrobe across ceremonies.' },
  { id: 'fitting', title: 'Custom Fitting', description: 'Precise measurements taken by our tailoring team for a made-to-fit silhouette.' },
  { id: 'styling', title: 'Styling Assistance', description: 'Guidance on jewellery, dupatta draping and complete look coordination.' },
  { id: 'video', title: 'Video Consultation', description: 'Meet a stylist over video call from anywhere in India.' },
  { id: 'whatsapp', title: 'WhatsApp Consultation', description: 'Quick questions answered directly over WhatsApp chat.' },
];

@Component({
  selector: 'app-bridal-concierge',
  standalone: true,
  templateUrl: './bridal-concierge.html',
  styleUrl: './bridal-concierge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BridalConcierge {
  protected services = SERVICES;
  protected selectedServices = signal<string[]>([]);
  protected name = signal('');
  protected phone = signal('');
  protected weddingDate = signal('');
  protected submitted = signal(false);

  protected toggleService(id: string): void {
    this.selectedServices.update((list) => (list.includes(id) ? list.filter((s) => s !== id) : [...list, id]));
  }

  protected submit(): void {
    if (!this.name() || !this.phone()) return;
    this.submitted.set(true);
  }

  protected whatsappHref(): string {
    const text = `Hi, I'd like to book a Bridal Concierge consultation.`;
    return `https://wa.me/917390965819?text=${encodeURIComponent(text)}`;
  }
}
