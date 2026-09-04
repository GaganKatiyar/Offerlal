import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminNavItem,
  AdminNavMenu,
  NavAdminService,
  NavItemWrite,
  OccasionRef,
  ReorderEntry,
} from '../../core/services/nav-api.service';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models';

/** A tree node flattened for rendering, carrying its depth. */
interface FlatItem {
  item: AdminNavItem;
  depth: number;
}

/**
 * The navigation master screen.
 *
 * Menus have been data-driven since the navigation work — the header, footer and
 * mega menu all read them — but there was no way to edit one except SQL.
 *
 * Follows the homepage editor's pattern rather than the coupons one: a single
 * route with a two-pane master/detail, a bulk reorder save, and server errors
 * surfaced verbatim. The coupons screens use separate routes against the demo
 * store with window.alert validation, which is the older shape and not worth
 * repeating.
 */
@Component({
  selector: 'app-nav-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './nav-editor.html',
  styleUrl: './nav-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavEditor {
  private api = inject(NavAdminService);
  private categoryService = inject(CategoryService);

  protected menus = signal<AdminNavMenu[]>([]);
  protected activeCode = signal<string>('header');
  protected selectedId = signal<number | null>(null);

  protected categories = signal<Category[]>([]);
  protected occasions = signal<OccasionRef[]>([]);

  protected loading = signal(true);
  protected saving = signal(false);
  protected message = signal<string | null>(null);
  protected error = signal<string | null>(null);
  protected dirty = signal(false);

  /** The editable copy of the selected item; edits never touch the tree directly. */
  protected draft = signal<NavItemWrite | null>(null);

  protected activeMenu = computed(() => this.menus().find((m) => m.code === this.activeCode()) ?? null);

  /**
   * The tree flattened depth-first, so one @for renders the whole thing and
   * reordering only ever has to move a node among its own siblings.
   */
  protected flat = computed<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    const walk = (items: AdminNavItem[], depth: number) => {
      for (const item of items) {
        out.push({ item, depth });
        if (item.children.length) walk(item.children, depth + 1);
      }
    };
    walk(this.activeMenu()?.items ?? [], 0);
    return out;
  });

  protected selected = computed(() => this.flat().find((f) => f.item.id === this.selectedId())?.item ?? null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      menus: this.api.getMenus(),
      categories: this.categoryService.getAll(),
      occasions: this.api.getOccasions(),
    }).subscribe({
      next: ({ menus, categories, occasions }) => {
        this.menus.set(menus);
        this.categories.set(categories);
        this.occasions.set(occasions);
        this.dirty.set(false);
        this.loading.set(false);
        if (this.selectedId() !== null) this.hydrateDraft();
      },
      error: (err) => {
        this.error.set(describeError(err));
        this.loading.set(false);
      },
    });
  }

  protected switchMenu(code: string): void {
    this.activeCode.set(code);
    this.selectedId.set(null);
    this.draft.set(null);
  }

  protected select(id: number): void {
    this.selectedId.set(id);
    this.hydrateDraft();
  }

  private hydrateDraft(): void {
    const item = this.selected();
    if (!item) {
      this.draft.set(null);
      return;
    }

    this.draft.set({
      parentId: item.parentId,
      label: item.label,
      // Derived from which target is actually populated, so the radio reflects
      // the stored state rather than a guess.
      linkType: item.categoryId ? 'category' : item.occasionId ? 'occasion' : 'url',
      url: item.url ?? '',
      categoryId: item.categoryId ?? '',
      occasionId: item.occasionId ?? '',
      iconName: item.iconName ?? '',
      columnIndex: item.columnIndex,
      isActive: item.isActive,
      isHighlighted: item.isHighlighted,
      badgeText: item.badgeText ?? '',
      startsAtUtc: item.startsAtUtc ?? null,
      endsAtUtc: item.endsAtUtc ?? null,
    });
  }

  protected touch(): void {
    this.dirty.set(true);
  }

  /**
   * Moves an item among its OWN siblings only.
   *
   * Re-parenting by arrow key is ambiguous — moving past the end of a list
   * could mean "become a child of the item above" or "move to the next group" —
   * so nesting is changed explicitly through the parent field instead.
   */
  protected move(item: AdminNavItem, direction: -1 | 1): void {
    const menu = this.activeMenu();
    if (!menu) return;

    const siblings = this.siblingsOf(item, menu.items);
    const index = siblings.findIndex((s) => s.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    siblings.forEach((s, i) => (s.displayOrder = (i + 1) * 10));

    this.menus.set([...this.menus()]);
    this.dirty.set(true);
  }

  private siblingsOf(item: AdminNavItem, roots: AdminNavItem[]): AdminNavItem[] {
    if (item.parentId === null) return roots;

    const find = (items: AdminNavItem[]): AdminNavItem[] | null => {
      for (const candidate of items) {
        if (candidate.id === item.parentId) return candidate.children;
        const nested = find(candidate.children);
        if (nested) return nested;
      }
      return null;
    };
    return find(roots) ?? roots;
  }

  protected toggleActive(item: AdminNavItem): void {
    item.isActive = !item.isActive;
    this.menus.set([...this.menus()]);
    this.dirty.set(true);
  }

  /** Saves the selected item's fields, then the whole tree's order. */
  protected save(): void {
    const draft = this.draft();
    const item = this.selected();
    const code = this.activeCode();
    if (!code) return;

    this.saving.set(true);
    this.message.set(null);
    this.error.set(null);

    const entries: ReorderEntry[] = this.flat().map(({ item: i }) => ({
      id: i.id,
      parentId: i.parentId,
      displayOrder: i.displayOrder,
      columnIndex: i.columnIndex,
      isActive: i.isActive,
    }));

    const finish = () =>
      this.api.reorder(code, entries).subscribe({
        next: (res) => {
          this.message.set(`Saved ${res.updated} item${res.updated === 1 ? '' : 's'}.`);
          this.saving.set(false);
          this.load();
        },
        error: (err) => {
          this.error.set(describeError(err));
          this.saving.set(false);
        },
      });

    if (draft && item) {
      this.api.update(item.id, this.normalise(draft)).subscribe({
        next: () => finish(),
        error: (err) => {
          this.error.set(describeError(err));
          this.saving.set(false);
        },
      });
    } else {
      finish();
    }
  }

  protected addItem(): void {
    const code = this.activeCode();
    const parent = this.selected();

    this.saving.set(true);
    this.api
      .create(code, {
        // New items land as a sibling of the selection, not a child — adding
        // under whatever happened to be selected is a surprising default.
        parentId: parent?.parentId ?? null,
        label: 'New link',
        linkType: 'url',
        url: '/',
        columnIndex: parent?.columnIndex ?? 0,
        isActive: false,
        isHighlighted: false,
      })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.message.set('Item added. It is hidden until you make it visible.');
          this.selectedId.set(created.id);
          this.load();
        },
        error: (err) => {
          this.error.set(describeError(err));
          this.saving.set(false);
        },
      });
  }

  protected removeItem(item: AdminNavItem): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${item.label}"?`)) return;

    this.saving.set(true);
    this.api.remove(item.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Item deleted.');
        if (this.selectedId() === item.id) this.selectedId.set(null);
        this.load();
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

  /** Blanks the targets the chosen link type does not use. */
  private normalise(draft: NavItemWrite): NavItemWrite {
    return {
      ...draft,
      url: draft.linkType === 'url' ? draft.url || '/' : null,
      categoryId: draft.linkType === 'category' ? draft.categoryId || null : null,
      occasionId: draft.linkType === 'occasion' ? draft.occasionId || null : null,
    };
  }
}

function describeError(err: unknown): string {
  const e = err as { status?: number; error?: { message?: string; detail?: string } };
  if (e?.status === 409) return e.error?.message ?? 'That item still has sub-items.';
  if (e?.status === 400) return e.error?.message ?? 'That change is not allowed.';
  if (e?.status === 403) return 'You do not have permission to edit navigation.';
  return e?.error?.detail ?? e?.error?.message ?? 'Something went wrong. Please try again.';
}
