import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';

@Component({
  selector: 'app-bridal-collection',
  standalone: true,
  imports: [RouterLink, ProductCard, ImageWithFallback],
  templateUrl: './bridal-collection.html',
  styleUrl: './bridal-collection.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BridalCollection implements OnInit {
  private productService = inject(ProductService);
  protected bridalProducts = signal<Product[]>([]);

  ngOnInit(): void {
    this.productService.getAll({}, 'recommended').subscribe((v) => this.bridalProducts.set(v.filter((p) => p.isBridal)));
  }
}
