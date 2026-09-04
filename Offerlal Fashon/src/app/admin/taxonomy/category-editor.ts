import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminCategory,
  CategoryWrite,
  TaxonomyAdminService,
} from '../../core/services/taxonomy-admin.service';

/** A category plus the depth it renders at, so the template stays flat. */
interface TreeRow {
  category: AdminCategory;
  depth: number;
  /** Position among its own siblings, for the ▲▼ buttons. */
  index: number;
  siblingCount: number;
}

/**
 * Categories master screen.
 *
 * Categories are the catalogue's spine — the PLP routes by their slug, the
 * navigation resolves link URLs from them — and they have been read-only since
 * the beginning, so a typo meant SQL against production.
 *
 * Two-pane, like the homepage and navigation editors: a tree on the left, the
 * selected category's fields on the right. Structural changes (move, reorder)
 * are batched and saved together, because the server rebuilds materialised
 * paths from the whole tree and a half-sent tree describes one that does not
 * exist. Field edits save per-category, since they are independent.
 */
@Component({
  selector: 'app-category-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './category-editor.html',
  styleUrl: './category-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryEditor {
  private api = inject(TaxonomyAdminService);

  protected categories = signal<AdminCategory[]>([]);
  protected selectedId = signal<string | null>(null);

  protected loading = signal(true);
  protected saving = signal(false);
  /** True once the tree's shape has been changed but not yet sent. */
  protected treeDirty = signal(false);
  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);

  /** Draft of the selected category's fields; committed on Save. */
  protected draft = signal<CategoryWrite | null>(null);

  constructor() {
    this.load();
  }

  /** Depth-first, so a child always renders directly under its parent. */
  protected rows = computed<TreeRow[]>(() => {
    const all = this.categories();
    const out: TreeRow[] = [];

    const walk = (parentId: string | null, depth: number) => {
      const siblings = all
        .filter((c) => (c.parentId ?? null) === parentId)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

      siblings.forEach((category, index) => {
        out.push({ category, depth, index, siblingCount: siblings.length });
        walk(category.id, depth + 1);
      });
    };

    walk(null, 0);
    return out;
  });

  protected selected = computed(() => this.categories().find((c) => c.id === this.selectedId()) ?? null);

  /** Valid parents for the selected category: not itself, not its own subtree. */
  protected parentOptions = computed(() => {
    const current = this.selected();
    if (!current) return [];
    return this.categories()
      .filter((c) => c.id !== current.id && !c.path.startsWith(current.path))
      .sort((a, b) => a.path.localeCompare(b.path));
  });

  private load(selectId?: string): void {
    this.loading.set(true);
    this.api.categories().subscribe({
      next: (rows) => {
        this.categories.set(rows);
        this.treeDirty.set(false);
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
    const c = this.categories().find((x) => x.id === id);
    this.draft.set(
      c
        ? {
            name: c.name,
            slug: c.slug,
            description: c.description,
            heroImageUrl: c.heroImageUrl,
            heroImageAssetId: c.heroImageAssetId,
            thumbnailUrl: c.thumbnailUrl,
            thumbnailAssetId: c.thumbnailAssetId,
            seoTitle: c.seoTitle,
            seoDescription: c.seoDescription,
            seoKeywords: c.seoKeywords,
            isActive: c.isActive,
          }
        : null,
    );
  }

  // ------------------------------------------------------------- structure

  /** Swaps with the neighbouring sibling. Order is only sent on Save. */
  protected move(row: TreeRow, delta: number): void {
    const target = this.rows().find(
      (r) => (r.category.parentId ?? null) === (row.category.parentId ?? null) && r.index === row.index + delta,
    );
    if (!target) return;

    this.categories.update((all) =>
      all.map((c) => {
        if (c.id === row.category.id) return { ...c, displayOrder: target.category.displayOrder };
        if (c.id === target.category.id) return { ...c, displayOrder: row.category.displayOrder };
        return c;
      }),
    );
    this.treeDirty.set(true);
  }

  protected reparent(id: string, parentId: string | null): void {
    this.categories.update((all) => all.map((c) => (c.id === id ? { ...c, parentId } : c)));
    this.treeDirty.set(true);
  }

  /**
   * Sends the whole tree, not just what moved.
   *
   * The server recomputes every path from this payload; sending only the moved
   * rows would ask it to rebuild from a tree it cannot see.
   */
  protected saveTree(): void {
    this.saving.set(true);
    this.clearBanners();

    const items = this.categories().map((c) => ({
      id: c.id,
      parentId: c.parentId ?? null,
      displayOrder: c.displayOrder,
    }));

    this.api.reorderCategories(items).subscribe({
      next: (res) => {
        this.saving.set(false);
        // Paths rewritten is the number worth reporting when it is non-zero:
        // moving one category rewrites its whole subtree, and that is what just
        // changed on the storefront. Reordering siblings rewrites nothing,
        // because a path is built from ids rather than positions - so say that
        // rather than reporting "0 rebuilt", which reads as nothing happening.
        this.message.set(
          res.pathsRewritten === 0
            ? 'Order saved. Nothing changed parent, so no shop-page listings moved.'
            : `Tree saved. ${res.pathsRewritten} categor${res.pathsRewritten === 1 ? 'y' : 'ies'} had their path rebuilt, ` +
              'so their shop-page listings have changed.',
        );
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(describeError(err));
      },
    });
  }

  // ---------------------------------------------------------------- fields

  protected saveFields(): void {
    const id = this.selectedId();
    const draft = this.draft();
    if (!id || !draft) return;

    this.saving.set(true);
    this.clearBanners();

    this.api.updateCategory(id, draft).subscribe({
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

  protected addCategory(): void {
    const name = 'New category';
    this.saving.set(true);
    this.clearBanners();

    this.api
      .createCategory({ name, parentId: this.selected()?.parentId ?? null, isActive: false })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          // Created hidden on purpose: a category is not merchandisable until
          // it has copy and imagery, and it would otherwise appear in the
          // storefront's menus the moment it was added.
          this.message.set('Added, hidden. Give it a name and imagery, then set it visible.');
          this.load(created.id);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(describeError(err));
        },
      });
  }

  protected remove(c: AdminCategory): void {
    if (!confirm(`Delete “${c.name}”? This cannot be undone.`)) return;

    this.saving.set(true);
    this.clearBanners();

    this.api.deleteCategory(c.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set(`Deleted “${c.name}”.`);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        // The server refuses while children or products still point at it, and
        // says how many. That message is more useful than a generic failure.
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
  if (e?.status === 403) return 'You do not have permission to edit categories.';
  return e?.error?.message ?? e?.error?.detail ?? 'Something went wrong. Please try again.';
}
