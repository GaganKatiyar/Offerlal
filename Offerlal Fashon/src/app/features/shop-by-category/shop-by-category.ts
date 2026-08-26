import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';

@Component({
  selector: 'app-shop-by-category',
  standalone: true,
  imports: [RouterLink, ImageWithFallback],
  templateUrl: './shop-by-category.html',
  styleUrl: './shop-by-category.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopByCategory implements OnInit {
  private categoryService = inject(CategoryService);
  protected categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.categoryService.getAll().subscribe((v) => this.categories.set(v));
  }
}
