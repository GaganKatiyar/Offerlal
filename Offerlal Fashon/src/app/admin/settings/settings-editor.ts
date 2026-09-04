import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsAdminService, StoreSetting } from '../../core/services/settings-admin.service';

/** Human labels for the groups the API returns. */
const GROUP_LABELS: Record<string, string> = {
  shipping: 'Shipping',
  contact: 'Contact',
  general: 'General',
};

/**
 * Store settings.
 *
 * These values genuinely drive behaviour — the free-shipping threshold is read
 * by the server when it prices a bag — but until now they could only be changed
 * with SQL. Every field here changes what customers are charged or told, which
 * is why the descriptions from the database are shown rather than hidden.
 */
@Component({
  selector: 'app-settings-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-editor.html',
  styleUrl: './settings-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsEditor {
  private api = inject(SettingsAdminService);

  protected settings = signal<StoreSetting[]>([]);
  protected loading = signal(true);
  protected saving = signal(false);
  protected dirty = signal(false);
  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);
  protected problems = signal<string[]>([]);

  /** Grouped for display; the API already returns them ordered by group. */
  protected groups = computed(() => {
    const byGroup = new Map<string, StoreSetting[]>();
    for (const s of this.settings()) {
      const list = byGroup.get(s.group) ?? [];
      list.push(s);
      byGroup.set(s.group, list);
    }
    return [...byGroup.entries()].map(([key, items]) => ({
      key,
      label: GROUP_LABELS[key] ?? key,
      items,
    }));
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.dirty.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.loading.set(false);
      },
    });
  }

  protected touch(): void {
    this.dirty.set(true);
    this.problems.set([]);
  }

  /** Numeric settings get a number input; everything else gets text. */
  protected inputType(setting: StoreSetting): string {
    return setting.valueType === 'decimal' || setting.valueType === 'int' ? 'number' : 'text';
  }

  /**
   * A readable label from the key.
   *
   * The prefix is dropped only when it IS the group: "shipping.flatFee" under
   * Shipping reads "Flat Fee". But "announcement.text" is grouped under General,
   * and dropping its prefix there labelled the announcement bar copy simply
   * "Text" — so when prefix and group differ the whole key is humanised.
   */
  protected labelFor(setting: StoreSetting): string {
    const [prefix, ...rest] = setting.key.split('.');
    const source = rest.length && prefix === setting.group ? rest.join('.') : setting.key;
    return source
      .split('.')
      .flatMap((part) => part.replace(/([A-Z])/g, ' $1').trim().split(/\s+/))
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  protected save(): void {
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);
    this.problems.set([]);

    const payload = this.settings().map((s) => ({ key: s.key, value: s.value ?? '' }));

    this.api.update(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.message.set(
          res.updated === 0
            ? 'No changes to save.'
            : `Saved ${res.updated} setting${res.updated === 1 ? '' : 's'}.`,
        );
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const e = err as { error?: { problems?: string[]; message?: string } };
        // The server validates the whole batch before writing any of it, so a
        // rejection means nothing changed — worth saying, or an admin will
        // assume some values went through.
        this.problems.set(e?.error?.problems ?? []);
        this.error.set(e?.error?.message ?? describeError(err));
      },
    });
  }

  protected reload(): void {
    this.load();
  }
}

function describeError(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; detail?: string } };
  if (e?.status === 403) return 'You do not have permission to edit settings.';
  return e?.error?.detail ?? e?.error?.message ?? 'Something went wrong. Please try again.';
}
