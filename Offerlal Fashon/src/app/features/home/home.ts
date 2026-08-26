import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { ReviewService } from '../../core/services/review.service';
import { DemoDataStoreService } from '../../core/services/demo-data-store.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { Product, Category, Occasion, BudgetTier, Review } from '../../core/models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StarRating } from '../../shared/components/star-rating/star-rating';
import { pexelsImage } from '../../core/demo-data/image-catalog.data';

const COMPLETE_LOOK_PRODUCT_IDS = ['prod-001', 'prod-049', 'prod-056', 'prod-058', 'prod-060'];

interface StyledByYouEntry {
  customerName: string;
  city: string;
  outfitName: string;
  productSlug: string;
  imageId: number;
}

const STYLED_BY_YOU: StyledByYouEntry[] = [
  { customerName: 'Ananya S.', city: 'Delhi', outfitName: 'Maroon Zari Embroidered Bridal Lehenga', productSlug: 'maroon-zari-embroidered-bridal-lehenga', imageId: 13661786 },
  { customerName: 'Priya R.', city: 'Hyderabad', outfitName: 'Red Zardozi Bridal Lehenga Set', productSlug: 'red-zardozi-bridal-lehenga', imageId: 27212066 },
  { customerName: 'Riya B.', city: 'Jaipur', outfitName: 'Peach Mirror Work Party Lehenga', productSlug: 'peach-mirror-work-party-lehenga', imageId: 8752674 },
  { customerName: 'Anjali G.', city: 'Lucknow', outfitName: 'Mustard Gota Patti Party Lehenga', productSlug: 'mustard-gota-patti-party-lehenga', imageId: 30918414 },
  { customerName: 'Tanya C.', city: 'Delhi', outfitName: 'Coral Sequin Party Lehenga', productSlug: 'coral-sequin-party-lehenga', imageId: 3680632 },
  { customerName: 'Kritika J.', city: 'Pune', outfitName: 'Yellow Mirror Work Gharara Set', productSlug: 'yellow-mirror-work-gharara-set', imageId: 20614154 },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProductCard, ImageWithFallback, InrCurrencyPipe, StarRating],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private reviewService = inject(ReviewService);
  private store = inject(DemoDataStoreService);
  private cart = inject(CartService);
  private toast = inject(ToastService);

  protected occasions = signal<Occasion[]>([]);
  protected categories = signal<Category[]>([]);
  protected newArrivals = signal<Product[]>([]);
  protected bridalEdit = signal<Product[]>([]);
  protected bestsellers = signal<Product[]>([]);
  protected budgetTiers = signal<BudgetTier[]>([]);
  protected testimonials = signal<Review[]>([]);
  protected styledByYou = STYLED_BY_YOU;

  protected pexelsImage = pexelsImage;

  ngOnInit(): void {
    this.categoryService.getOccasions().subscribe((v) => this.occasions.set(v));
    this.categoryService.getAll().subscribe((v) => this.categories.set(v));
    this.categoryService.getBudgetTiers().subscribe((v) => this.budgetTiers.set(v));
    this.productService.getNewArrivals(8).subscribe((v) => this.newArrivals.set(v));
    this.productService.getBridalEdit(6).subscribe((v) => this.bridalEdit.set(v));
    this.productService.getBestsellers(8).subscribe((v) => this.bestsellers.set(v));
    this.reviewService.getFeatured(6).subscribe((v) => this.testimonials.set(v));
  }

  protected productForSlug(slug: string): Product | undefined {
    return this.store.products().find((p) => p.slug === slug);
  }

  /** Real "Up to X% Off" label per category, computed from actual product discounts. */
  protected categoryDiscountLabel(categoryId: string): string {
    const discounts = this.store
      .products()
      .filter((p) => p.categoryId === categoryId && p.compareAtPrice && p.compareAtPrice > p.price)
      .map((p) => Math.round(((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100));
    if (!discounts.length) return 'New In';
    return `Up to ${Math.max(...discounts)}% Off`;
  }

  protected completeLookItems(): Product[] {
    return COMPLETE_LOOK_PRODUCT_IDS.map((id) => this.store.products().find((p) => p.id === id)).filter((p): p is Product => !!p);
  }

  protected completeLookTotal(): number {
    return this.completeLookItems().reduce((sum, p) => sum + p.price, 0);
  }

  protected shopTheLook(): void {
    this.completeLookItems().forEach((p) => {
      const variant = p.variants[0];
      const size = p.sizes.find((s) => s !== 'Custom') ?? p.sizes[0];
      this.cart.add(p, variant, size, 1);
    });
    this.toast.show('The complete look has been added to your bag');
    this.cart.openDrawer();
  }
}
