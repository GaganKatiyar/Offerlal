import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DemoDataStoreService } from '../../../core/services/demo-data-store.service';
import { Product, StockStatus } from '../../../core/models';

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Custom', 'Free Size'];

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-form.html',
  styleUrl: '../../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductForm implements OnInit {
  private store = inject(DemoDataStoreService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected isEdit = signal(false);
  protected productId = signal<string | null>(null);
  protected allSizes = ALL_SIZES;
  protected categories = this.store.categories;

  protected name = signal('');
  protected sku = signal('');
  protected categoryId = signal('');
  protected occasion = signal('');
  protected description = signal('');
  protected shortDescription = signal('');
  protected fabric = signal('');
  protected workDetails = signal('');
  protected color = signal('Maroon');
  protected colorHex = signal('#6E1E2C');
  protected imageUrl = signal('');
  protected price = signal(0);
  protected compareAtPrice = signal<number | undefined>(undefined);
  protected selectedSizes = signal<string[]>(['S', 'M', 'L']);
  protected stockStatus = signal<StockStatus>('in-stock');
  protected stockPerSize = signal(5);
  protected isBestseller = signal(false);
  protected isNewArrival = signal(false);
  protected isFeatured = signal(false);
  protected isBridal = signal(false);
  protected metaTitle = signal('');
  protected metaDescription = signal('');
  protected slug = signal('');
  protected keywords = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const product = this.store.products().find((p) => p.id === id);
      if (product) {
        this.isEdit.set(true);
        this.productId.set(id);
        this.populate(product);
      }
    }
  }

  private populate(p: Product): void {
    this.name.set(p.name);
    this.sku.set(p.sku);
    this.categoryId.set(p.categoryId);
    this.occasion.set(p.occasion.join(', '));
    this.description.set(p.description);
    this.shortDescription.set(p.shortDescription);
    this.fabric.set(p.fabric);
    this.workDetails.set(p.workDetails);
    this.color.set(p.variants[0]?.color ?? '');
    this.colorHex.set(p.variants[0]?.colorHex ?? '#6E1E2C');
    this.imageUrl.set(p.variants[0]?.images[0]?.url ?? '');
    this.price.set(p.price);
    this.compareAtPrice.set(p.compareAtPrice);
    this.selectedSizes.set(p.sizes);
    this.stockStatus.set(p.stockStatus);
    this.isBestseller.set(p.isBestseller);
    this.isNewArrival.set(p.isNewArrival);
    this.isFeatured.set(p.isFeatured);
    this.isBridal.set(p.isBridal);
    this.metaTitle.set(p.seo.metaTitle);
    this.metaDescription.set(p.seo.metaDescription);
    this.slug.set(p.seo.slug);
    this.keywords.set(p.seo.keywords.join(', '));
  }

  protected toggleSize(size: string): void {
    this.selectedSizes.update((list) => (list.includes(size) ? list.filter((s) => s !== size) : [...list, size]));
  }

  protected save(): void {
    if (!this.name() || !this.categoryId() || !this.price()) {
      if (typeof window !== 'undefined') window.alert('Please fill in name, category and price.');
      return;
    }

    const slugValue = this.slug() || this.name().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const skus = this.selectedSizes().map((size) => ({ sku: `${this.sku() || 'OF-NEW'}-${size.toUpperCase()}`, size, stock: this.stockPerSize() }));

    const productData: Product = {
      id: this.productId() ?? `prod-${Date.now()}`,
      slug: slugValue,
      name: this.name(),
      sku: this.sku() || `OF-NEW-${Date.now().toString().slice(-4)}`,
      categoryId: this.categoryId(),
      occasion: this.occasion().split(',').map((s) => s.trim()).filter(Boolean),
      description: this.description(),
      shortDescription: this.shortDescription(),
      fabric: this.fabric(),
      workDetails: this.workDetails(),
      variants: [
        {
          id: `var-${Date.now()}`,
          color: this.color(),
          colorHex: this.colorHex(),
          images: [{ id: `img-${Date.now()}`, url: this.imageUrl() || '/images/placeholder-product.svg', alt: this.name(), isPrimary: true }],
          skus,
        },
      ],
      sizes: this.selectedSizes(),
      price: this.price(),
      compareAtPrice: this.compareAtPrice(),
      currency: 'INR',
      rating: 4.5,
      reviewCount: 0,
      stockStatus: this.stockStatus(),
      customizationOptions: [],
      isBestseller: this.isBestseller(),
      isNewArrival: this.isNewArrival(),
      isFeatured: this.isFeatured(),
      isBridal: this.isBridal(),
      careInstructions: ['Dry clean only'],
      deliveryEstimateDays: { standard: 7, express: 4 },
      tags: this.keywords().split(',').map((s) => s.trim()).filter(Boolean),
      seo: {
        metaTitle: this.metaTitle() || `${this.name()} | Offerlal Fashion`,
        metaDescription: this.metaDescription() || this.shortDescription(),
        slug: slugValue,
        keywords: this.keywords().split(',').map((s) => s.trim()).filter(Boolean),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.isEdit() && this.productId()) {
      this.store.updateProduct(this.productId()!, productData);
    } else {
      this.store.addProduct(productData);
    }
    this.router.navigate(['/admin/products']);
  }
}
