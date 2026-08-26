export interface CartItemCustomization {
  optionId: string;
  label: string;
  priceDelta: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  customizations: CartItemCustomization[];
  addedAt: string;
}
