import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavApiService } from './nav-api.service';

/**
 * Store settings, read once per session.
 *
 * The free-shipping threshold appeared as a literal 2,999 in the announcement
 * bar, the PDP, the About page, the cart and checkout. Five copies of one
 * number means changing it is a search-and-replace that will miss one — and
 * the one it misses is the one a customer quotes back at you.
 *
 * Falls back to the previous hardcoded values if the settings call fails, so a
 * blip shows a slightly stale number rather than an empty space where a price
 * promise should be.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private nav = inject(NavApiService);

  private settings = toSignal(
    this.nav.getSettings().pipe(catchError(() => of<Record<string, string | null>>({}))),
    { initialValue: {} as Record<string, string | null> },
  );

  private num(key: string, fallback: number): number {
    const raw = this.settings()[key];
    const parsed = raw === null || raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  readonly freeShippingThreshold = computed(() => this.num('shipping.freeThreshold', 2999));
  readonly flatShippingFee = computed(() => this.num('shipping.flatFee', 150));
  readonly expressShippingFee = computed(() => this.num('shipping.expressFee', 250));

  readonly whatsappNumber = computed(() => this.settings()['contact.whatsapp'] ?? '917390965819');
  readonly supportEmail = computed(() => this.settings()['contact.email'] ?? 'hello@offerlal.com');
  readonly announcementText = computed(() => this.settings()['announcement.text'] ?? '');

  /** Formatted for display, e.g. "₹2,999". */
  readonly freeShippingLabel = computed(() => `₹${this.freeShippingThreshold().toLocaleString('en-IN')}`);
}
