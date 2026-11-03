import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MediaApiService, MediaAsset, MediaFolder } from '../../../core/services/media-api.service';

/**
 * Picks an image from the media library, or uploads a new one.
 *
 * The library API has been complete and authorised since the media work — list,
 * folders, upload, alt-text patch — with no screen behind it, so every image in
 * the CMS had to be attached by its database id. This is the screen.
 *
 * A modal rather than a route: picking an image is a step inside editing
 * something else, and navigating away would lose unsaved edits on the form
 * behind it.
 */
@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './media-picker.html',
  styleUrl: './media-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPicker {
  open = input(false);

  /** Where an upload from this picker lands, e.g. "banners". */
  folder = input<string>('uploads');

  picked = output<MediaAsset>();
  closed = output<void>();

  private api = inject(MediaApiService);

  protected assets = signal<MediaAsset[]>([]);
  protected folders = signal<MediaFolder[]>([]);
  protected activeFolder = signal<string | null>(null);
  protected search = signal('');

  protected loading = signal(false);
  protected uploading = signal(false);
  protected error = signal<string | null>(null);

  private loaded = false;

  constructor() {
    // Load the first time the picker is actually opened.
    //
    // ensureLoaded existed but nothing called it, so the picker opened onto an
    // empty grid — the API was never hit at all. Deferring to open rather than
    // construction still matters: the picker is mounted on every editor visit
    // and most edits never touch an image.
    effect(() => {
      if (this.open()) this.ensureLoaded();
    });
  }

  /** Loaded on first open, not on construction — most edits never open it. */
  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.refresh();
    this.api.folders().subscribe({
      next: (f) => this.folders.set(f),
      error: () => this.folders.set([]),
    });
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.activeFolder(), this.search() || null, 1, 60).subscribe({
      next: (page) => {
        this.assets.set(page.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the media library.');
        this.loading.set(false);
      },
    });
  }

  protected selectFolder(folder: string | null): void {
    this.activeFolder.set(folder);
    this.refresh();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.refresh();
  }

  protected choose(asset: MediaAsset): void {
    this.picked.emit(asset);
    this.closed.emit();
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.error.set(null);

    this.api.upload(file, this.folder()).subscribe({
      next: (asset) => {
        this.uploading.set(false);
        // Clear the input so re-picking the same file fires change again.
        input.value = '';
        // Prepend rather than refetch: the upload response IS the new asset,
        // and a refetch would lose the current folder and search.
        this.assets.set([asset, ...this.assets().filter((a) => a.id !== asset.id)]);
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        input.value = '';
        const e = err as { error?: string | { message?: string } };
        this.error.set(
          typeof e?.error === 'string' ? e.error : (e?.error?.message ?? 'That file could not be uploaded.'),
        );
      },
    });
  }

  protected close(): void {
    this.closed.emit();
  }
}
