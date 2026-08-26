export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary?: boolean;
}

export interface ProductSku {
  sku: string;
  size: string;
  stock: number;
}

export interface ProductVariant {
  id: string;
  color: string;
  colorHex: string;
  images: ProductImage[];
  skus: ProductSku[];
}

export type CustomizationType =
  | 'blouse-stitching'
  | 'dupatta-style'
  | 'fall-pico'
  | 'custom-size'
  | 'petticoat'
  | 'sleeve'
  | 'neck-design'
  | 'padding'
  | 'can-can';

export interface CustomizationOption {
  id: string;
  type: CustomizationType;
  label: string;
  priceDelta: number;
  description?: string;
}

export interface ProductSeo {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'made-to-order';

export interface DeliveryEstimate {
  standard: number;
  express?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  categoryId: string;
  subCategory?: string;
  occasion: string[];
  description: string;
  shortDescription: string;
  fabric: string;
  workDetails: string;
  blouseDetails?: string;
  dupattaDetails?: string;
  variants: ProductVariant[];
  sizes: string[];
  price: number;
  compareAtPrice?: number;
  currency: 'INR';
  rating: number;
  reviewCount: number;
  stockStatus: StockStatus;
  customizationOptions: CustomizationOption[];
  isBestseller: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  isBridal: boolean;
  careInstructions: string[];
  deliveryEstimateDays: DeliveryEstimate;
  weightGrams?: number;
  tags: string[];
  seo: ProductSeo;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  categoryId?: string;
  occasion?: string;
  priceMin?: number;
  priceMax?: number;
  colors?: string[];
  sizes?: string[];
  fabrics?: string[];
  work?: string[];
  inStockOnly?: boolean;
  minRating?: number;
  query?: string;
}

export type ProductSortOption =
  | 'recommended'
  | 'newest'
  | 'bestselling'
  | 'price-asc'
  | 'price-desc'
  | 'rating';
