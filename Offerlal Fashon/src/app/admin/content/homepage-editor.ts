import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  AdminPage,
  AdminSection,
  AdminSectionItem,
  ContentAdminService,
  RevisionInfo,
  SectionItemWrite,
} from '../../core/services/content-api.service';
import { MediaPicker } from '../shared/media-picker/media-picker';
import { MediaAsset } from '../../core/services/media-api.service';

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
  imports: [FormsModule, DatePipe, MediaPicker],
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

  /** Items belong to the selected section; there is no separate fetch. */
  protected items = computed<AdminSectionItem[]>(() => this.selected()?.items ?? []);

  protected pickerOpen = signal(false);
  private pickerTargetId = signal<number | null>(null);

  /**
   * Which fields an item shows, decided by the SECTION type rather than by the
   * item. A trust badge has an icon, a title and a caption; a hero slide has an
   * image, a headline and a link. Showing every field for every kind would make
   * the common case unreadable.
   */
  protected itemShape = computed(() => {
    const type = this.selected()?.type ?? '';
    return {
      image: type === 'hero-carousel' || type === 'ugc-grid',
      badge: type === 'hero-carousel' || type === 'trust-strip',
      caption: type !== 'product-rail',
      link: type !== 'trust-strip',
      product: type === 'product-rail',
    };
  });

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

  // --- Items ----------------------------------------------------------------

  protected addItem(): void {
    const section = this.selected();
    if (!section) return;

    this.saving.set(true);
    this.api.createItem(section.id, { isActive: false, title: 'New item' }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Item added. It is hidden until you make it visible.');
        this.load();
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.saving.set(false);
      },
    });
  }

  protected saveItem(item: AdminSectionItem): void {
    this.saving.set(true);
    const payload: SectionItemWrite = {
      title: item.title,
      subtitle: item.subtitle,
      caption: item.caption,
      badgeText: item.badgeText,
      linkUrl: item.linkUrl,
      isActive: item.isActive,
      mediaAssetId: item.mediaAssetId,
      productId: item.productId,
    };

    this.api.updateItem(item.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Item saved.');
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.saving.set(false);
      },
    });
  }

  protected deleteItem(item: AdminSectionItem): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${item.title || 'this item'}"?`)) return;

    this.saving.set(true);
    this.api.deleteItem(item.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.saving.set(false);
      },
    });
  }

  protected openPicker(item: AdminSectionItem): void {
    this.pickerTargetId.set(item.id);
    this.pickerOpen.set(true);
  }

  protected onPicked(asset: MediaAsset): void {
    const id = this.pickerTargetId();
    const item = this.items().find((i) => i.id === id);
    if (!item) return;

    item.mediaAssetId = asset.id;
    item.mediaUrl = asset.url;
    item.mediaAlt = asset.altText ?? null;
    // Saved immediately: a picked image that needs a second Save is the kind of
    // thing people assume already applied.
    this.saveItem(item);
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
