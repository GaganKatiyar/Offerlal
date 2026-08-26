import { ProductSeo } from './product.model';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  parentId?: string | null;
  displayOrder: number;
  seo: ProductSeo;
}

export interface Occasion {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  description: string;
}

export interface BudgetTier {
  id: string;
  label: string;
  min: number;
  max: number | null;
  imageUrl: string;
}
