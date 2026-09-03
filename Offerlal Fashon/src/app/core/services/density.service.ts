import { DOCUMENT, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type GridDensity = 'comfortable' | 'compact' | 'single';

export interface DensityOption {
  id: GridDensity;
  label: string;
  /** Column count at the widest breakpoint, shown as a hint in the control. */
  hint: string;
}

export const DENSITY_OPTIONS: DensityOption[] = [
  { id: 'comfortable', label: 'Comfortable', hint: 'Larger images' },
  { id: 'compact', label: 'Compact', hint: 'More per row' },
  { id: 'single', label: 'Single', hint: 'One at a time' },
];

const DENSITY_KEY = 'offerlal_density_v1';
const DEFAULT_DENSITY: GridDensity = 'comfortable';

/**
 * Product-grid density, applied as `data-density` on the document element and
 * consumed entirely in CSS by styles/_layout.scss.
 *
 * Comfortable is the default deliberately. Myntra runs 5-up on wide desktop
 * because its median item is decided on brand and price; a garment priced in
 * five and six figures is decided on the zari work and the drape, which a
 * ~210px tile cannot show. Shoppers who want Myntra's density can choose it —
 * it just isn't imposed on the merchandise.
 *
 * DOM and storage access go through injected tokens rather than global
 * `document` / `localStorage`, so this keeps working under SSR (planned) and
 * in unit tests. Private-mode Safari throws on localStorage access rather than
 * returning null, hence the try/catch rather than a typeof check.
 */
@Injectable({ providedIn: 'root' })
export class DensityService {
  readonly options = DENSITY_OPTIONS;

  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly density = signal<GridDensity>(this.readStored());

  constructor() {
    effect(() => {
      const value = this.density();
      this.doc.documentElement.setAttribute('data-density', value);
      this.write(value);
    });
  }

  set(value: GridDensity): void {
    if (!DENSITY_OPTIONS.some((o) => o.id === value)) return;
    this.density.set(value);
  }

  private readStored(): GridDensity {
    if (!this.isBrowser) return DEFAULT_DENSITY;
    try {
      const stored = this.doc.defaultView?.localStorage.getItem(DENSITY_KEY);
      return DENSITY_OPTIONS.some((o) => o.id === stored)
        ? (stored as GridDensity)
        : DEFAULT_DENSITY;
    } catch {
      return DEFAULT_DENSITY;
    }
  }

  private write(value: GridDensity): void {
    if (!this.isBrowser) return;
    try {
      this.doc.defaultView?.localStorage.setItem(DENSITY_KEY, value);
    } catch {
      // Storage unavailable (private mode, blocked cookies). The preference
      // simply does not persist; the session still honours it.
    }
  }
}
