import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  AdminPage,
  AdminSection,
  ContentAdminService,
  RevisionInfo,
} from '../../core/services/content-api.service';

const PAGE_KEY = 'home';

/**
 * The homepage editor.
 *
 * A structured section list rather than a WYSIWYG page builder. For one
 * developer a drag-to-reorder list with a properties panel gets most of the
 * value at a fraction of the maintenance, and it cannot produce a page the
 * frontend does not know how to render — which a free-form builder can.
 *
 * Reordering is deliberately buttons rather than HTML5 drag-and-drop: drag
 * needs pointer, keyboard and touch paths to be accessible at all, and
 * up/down buttons are usable by everyone on day one.
 */
@Component({
  selector: 'app-homepage-editor',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './homepage-editor.html',
  styleUrl: './homepage-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomepageEditor {
  private api = inject(ContentAdminService);

  protected page = signal<AdminPage | null>(null);
  protected sections = signal<AdminSection[]>([]);
  protected selectedId = signal<number | null>(null);
  protected revisions = signal<RevisionInfo[]>([]);

  protected loading = signal(true);
  protected saving = signal(false);
  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);

  /** True once anything has been edited, so Save is only offered when it would do something. */
  protected dirty = signal(false);

  protected selected = computed(() => this.sections().find((s) => s.id === this.selectedId()) ?? null);

  protected typeName = computed(() => {
    const types = this.page()?.sectionTypes ?? [];
    return (code: string) => types.find((t) => t.code === code)?.name ?? code;
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.getPage(PAGE_KEY).subscribe({
      next: (page) => {
        this.page.set(page);
        this.sections.set([...page.sections].sort((a, b) => a.displayOrder - b.displayOrder));
        this.selectedId.set(page.sections[0]?.id ?? null);
        this.dirty.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.loading.set(false);
      },
    });
    this.api.revisions(PAGE_KEY).subscribe({
      next: (r) => this.revisions.set(r),
      error: () => this.revisions.set([]),
    });
  }

  protected select(id: number): void {
    this.selectedId.set(id);
  }

  protected move(id: number, direction: -1 | 1): void {
    const list = [...this.sections()];
    const index = list.findIndex((s) => s.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;

    [list[index], list[target]] = [list[target], list[index]];

    // Renumber in tens so a later insert has room without renumbering again.
    list.forEach((s, i) => (s.displayOrder = (i + 1) * 10));
    this.sections.set(list);
    this.dirty.set(true);
  }

  protected toggleActive(section: AdminSection): void {
    section.isActive = !section.isActive;
    this.sections.set([...this.sections()]);
    this.dirty.set(true);
  }

  /** Called on every field edit; the panel binds with ngModel. */
  protected touch(): void {
    this.dirty.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    this.api.saveSections(PAGE_KEY, this.sections()).subscribe({
      next: (res) => {
        this.message.set(`Saved ${res.updated} section${res.updated === 1 ? '' : 's'}.`);
        this.saving.set(false);
        // Reload so the new RowVersions are picked up; saving twice against a
        // stale version would otherwise conflict with our own first save.
        this.load();
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.saving.set(false);
      },
    });
  }

  protected publish(): void {
    this.saving.set(true);
    this.api.publish(PAGE_KEY).subscribe({
      next: (res) => {
        this.message.set(`Published revision ${res.revisionId}.`);
        this.saving.set(false);
        this.api.revisions(PAGE_KEY).subscribe((r) => this.revisions.set(r));
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.saving.set(false);
      },
    });
  }

  protected reload(): void {
    this.load();
  }

  /** Human-readable schedule state for the list's pill. */
  protected scheduleLabel(section: AdminSection): string | null {
    if (!section.startsAtUtc && !section.endsAtUtc) return null;
    const from = section.startsAtUtc ? new Date(section.startsAtUtc).toLocaleDateString() : '—';
    const to = section.endsAtUtc ? new Date(section.endsAtUtc).toLocaleDateString() : '—';
    return `${from} → ${to}`;
  }
}

function describeError(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; detail?: string } };
  if (e?.status === 409) return e.error?.message ?? 'Someone else saved first. Reload before saving.';
  if (e?.status === 403) return e.error?.detail ?? 'Content administration is not available here.';
  return e?.error?.detail ?? e?.error?.message ?? 'Something went wrong. Please try again.';
}
