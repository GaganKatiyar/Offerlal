import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminOccasion,
  OccasionWrite,
  TaxonomyAdminService,
} from '../../core/services/taxonomy-admin.service';

/**
 * Occasions master screen.
 *
 * Occasions are a flat list, so this is the plain sibling of the category
 * editor: no tree, no reorder, no path to rebuild. They are a first-class PLP
 * filter and a navigation link target, and until the navigation work there was
 * not even an endpoint to list them.
 */
@Component({
  selector: 'app-occasion-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './occasion-editor.html',
  styleUrl: './occasion-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OccasionEditor {
  private api = inject(TaxonomyAdminService);

  protected occasions = signal<AdminOccasion[]>([]);
  protected selectedId = signal<string | null>(null);
  protected draft = signal<OccasionWrite | null>(null);

  protected loading = signal(true);
  protected saving = signal(false);
  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);

  protected selected = computed(() => this.occasions().find((o) => o.id === this.selectedId()) ?? null);

  constructor() {
    this.load();
  }

  private load(selectId?: string): void {
    this.loading.set(true);
    this.api.occasions().subscribe({
      next: (rows) => {
        this.occasions.set(rows);
        this.loading.set(false);
        const keep = selectId ?? this.selectedId();
        this.select(rows.some((r) => r.id === keep) ? keep! : (rows[0]?.id ?? null));
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.loading.set(false);
      },
    });
  }

  protected select(id: string | null): void {
    this.selectedId.set(id);
    const o = this.occasions().find((x) => x.id === id);
    this.draft.set(
      o
        ? {
            name: o.name,
            slug: o.slug,
            description: o.description,
            imageUrl: o.imageUrl,
            imageAssetId: o.imageAssetId,
          }
        : null,
    );
  }

  protected save(): void {
    const id = this.selectedId();
    const draft = this.draft();
    if (!id || !draft) return;

    this.saving.set(true);
    this.clearBanners();

    this.api.updateOccasion(id, draft).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.message.set(`Saved “${updated.name}”.`);
        this.load(id);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(describeError(err));
      },
    });
  }

  protected add(): void {
    this.saving.set(true);
    this.clearBanners();

    this.api.createOccasion({ name: 'New occasion' }).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.message.set('Added. Give it a name and image, then save.');
        this.load(created.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(describeError(err));
      },
    });
  }

  protected remove(o: AdminOccasion): void {
    if (!confirm(`Delete “${o.name}”? This cannot be undone.`)) return;

    this.saving.set(true);
    this.clearBanners();

    this.api.deleteOccasion(o.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(`Deleted “${o.name}”.`);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        // Refused while products or navigation items still point at it; the
        // server says how many, which is the useful part.
        this.error.set(describeError(err));
      },
    });
  }

  protected reload(): void {
    this.clearBanners();
    this.load();
  }

  private clearBanners(): void {
    this.message.set(null);
    this.error.set(null);
  }
}

function describeError(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; detail?: string } };
  if (e?.status === 403) return 'You do not have permission to edit occasions.';
  return e?.error?.message ?? e?.error?.detail ?? 'Something went wrong. Please try again.';
}
