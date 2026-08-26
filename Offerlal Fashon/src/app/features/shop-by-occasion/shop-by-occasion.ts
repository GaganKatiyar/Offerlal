import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { Occasion } from '../../core/models';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';

@Component({
  selector: 'app-shop-by-occasion',
  standalone: true,
  imports: [RouterLink, ImageWithFallback],
  templateUrl: './shop-by-occasion.html',
  styleUrl: './shop-by-occasion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopByOccasion implements OnInit {
  private categoryService = inject(CategoryService);
  protected occasions = signal<Occasion[]>([]);

  ngOnInit(): void {
    this.categoryService.getOccasions().subscribe((v) => this.occasions.set(v));
  }
}
