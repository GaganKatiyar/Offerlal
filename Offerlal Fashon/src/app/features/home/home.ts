import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ContentApiService } from '../../core/services/content-api.service';
import { ContentSection } from '../../core/models/content.model';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { ReviewService } from '../../core/services/review.service';
import { DemoDataStoreService } from '../../core/services/demo-data-store.service';
import { Product, Category, Occasion, BudgetTier, Review } from '../../core/models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ImageWithFallback } from '../../shared/components/image-with-fallback/image-with-fallback';
import { StarRating } from '../../shared/components/star-rating/star-rating';
import { SectionHeader } from '../../shared/components/section-header/section-header';
import { ScrollRail } from '../../shared/components/scroll-rail/scroll-rail';
import { HeroCarousel } from '../../shared/components/hero-carousel/hero-carousel';
import { PromoStrip } from '../../shared/components/promo-strip/promo-strip';
import { AppDownload } from '../../shared/components/app-download/app-download';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, ProductCard, ImageWithFallback, StarRating, SectionHeader, ScrollRail, HeroCarousel, PromoStrip, AppDownload],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private reviewService = inject(ReviewService);
  private store = inject(DemoDataStoreService);
  private contentApi = inject(ContentApiService);

  /**
   * The page as the CMS defines it: which sections, in what order, with what
   * copy. Everything below it is still demo-backed data for the section BODIES
   * (occasions, categories, budget tiers, testimonials), which move to the API
   * in later phases — but the page's structure is no longer in the template.
   */
  private page = rxResource({ stream: () => this.contentApi.getPage('home') });

  protected sections = computed<ContentSection[]>(() => this.page.value()?.sections ?? []);

  protected occasions = signal<Occasion[]>([]);
  protected categories = signal<Category[]>([]);
  protected bridalEdit = signal<Product[]>([]);
  protected budgetTiers = signal<BudgetTier[]>([]);
  protected testimonials = signal<Review[]>([]);

  ngOnInit(): void {
    this.categoryService.getOccasions().subscribe((v) => this.occasions.set(v));
    this.categoryService.getAll().subscribe((v) => this.categories.set(v));
    this.categoryService.getBudgetTiers().subscribe((v) => this.budgetTiers.set(v));
    this.productService.getBridalEdit(6).subscribe((v) => this.bridalEdit.set(v));
    this.reviewService.getFeatured(6).subscribe((v) => this.testimonials.set(v));
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

}
