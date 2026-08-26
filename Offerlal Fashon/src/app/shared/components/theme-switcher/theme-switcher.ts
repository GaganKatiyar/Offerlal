import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcher {
  protected theme = inject(ThemeService);
  private host = inject(ElementRef<HTMLElement>);

  protected open = signal(false);
  protected currentSwatch = computed(
    () => this.theme.themes.find((t) => t.id === this.theme.currentThemeId())?.swatch ?? this.theme.themes[0].swatch,
  );

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected choose(id: string): void {
    this.theme.setTheme(id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
