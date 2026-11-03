import { ProductCardModel } from './catalog-search.model';

/** One typed child row of a section: a banner, tile, trust badge or UGC photo. */
export interface ContentItem {
  id: number;
  kind: string;
  title?: string;
  subtitle?: string;
  caption?: string;
  badgeText?: string;
  linkUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  mobileImageUrl?: string;
  productId?: string;
  categoryId?: string;
  occasionId?: string;
}

export interface ContentSection {
  id: number;
  /**
   * Section type code. Mapped to a renderer by the homepage host; an UNKNOWN
   * code renders nothing rather than breaking the page, so a new type can be
   * added in admin before the frontend supports it.
   */
  type: string;
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  config: Record<string, unknown>;
  items: ContentItem[];
  /** Resolved rail products: manual pins first, then the rule's backfill. */
  products: ProductCardModel[];
}

export interface ContentPage {
  key: string;
  name: string;
  sections: ContentSection[];
}
