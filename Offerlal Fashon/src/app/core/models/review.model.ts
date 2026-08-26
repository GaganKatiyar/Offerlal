export interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  customerCity?: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  helpfulCount: number;
  images?: string[];
}
