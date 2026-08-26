import { Injectable, effect, signal } from '@angular/core';

export interface StorefrontTheme {
  id: string;
  name: string;
  swatch: string; // representative hex for the theme picker dot
}

export const THEMES: StorefrontTheme[] = [
  { id: 'royal-wine', name: 'Default', swatch: '#a31621' },
  { id: 'bridal-red', name: 'Red', swatch: '#c81e2c' },
];

const THEME_KEY = 'offerlal_theme_v1';
const DEFAULT_THEME = 'royal-wine';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes = THEMES;
  readonly currentThemeId = signal<string>(this.readStoredTheme());

  constructor() {
    effect(() => {
      const id = this.currentThemeId();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', id);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_KEY, id);
      }
    });
  }

  setTheme(id: string): void {
    if (!THEMES.some((t) => t.id === id)) return;
    this.currentThemeId.set(id);
  }

  private readStoredTheme(): string {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_KEY);
    return stored && THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
  }
}
