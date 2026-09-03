/**
 * Wire types for the server-side catalogue search endpoint.
 *
 * These mirror the API's ProductCardDto / FacetDto exactly and are deliberately
 * separate from the rich `Product` model. A card renders a thumbnail, a couple
 * of lines and a price; making it carry the full product shape is what led the
 * API to Include every variant and every image on every variant just to draw a
 * grid.
 */

export interface Swatch {
  color: string;
  colorHex: string;
}

/** Exactly what a product card draws — nothing more. */
export interface ProductCardModel {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  /** Bold descriptor line: "Heavy Bridal", "Anarkali". */
  subCategory?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  isBestseller: boolean;
  isNewArrival: boolean;
  fabric: string;
  hasCustomSizing: boolean;
  thumbnailUrl?: string;
  swatches: Swatch[];
}

export interface FacetOption {
  /** Slug — this is what appears in the URL. */
  value: string;
  label: string;
  count: number;
  swatchHex?: string;
  displayOrder: number;
}

export interface Facet {
  code: string;
  label: string;
  /** swatch | multiselect — tells the rail how to render this facet. */
  inputType: string;
  options: FacetOption[];
}

export interface PriceBounds {
  min: number;
  max: number;
}

export interface ProductSearchResult {
  items: ProductCardModel[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  facets: Facet[];
  priceBounds: PriceBounds;
}

/**
 * The complete PLP query. Every field here round-trips through the URL, so a
 * filtered view is shareable and the back button undoes a filter.
 */
export interface CatalogQuery {
  categoryId?: string;
  occasionId?: string;
  q?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  customSizing?: boolean;
  newArrivals?: boolean;
  onSale?: boolean;
  minRating?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
  /** Selected facet options keyed by attribute code, e.g. { colour: ['red'] }. */
  facets?: Record<string, string[]>;
}
