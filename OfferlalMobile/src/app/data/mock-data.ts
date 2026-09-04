export interface MobileProduct {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  imageUrl2: string;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  colors: { name: string; hex: string }[];
  /**
   * Purchasable variants, with their ids.
   *
   * `colors` above is for display only. The server addresses a SKU by product +
   * variant + size, so the bag has to carry a real variant id - a colour name
   * cannot be resolved back to one.
   */
  variants?: { id: string; color: string; hex: string }[];
  sizes: string[];
  fabric: string;
  workDetails: string;
  description: string;
}

export interface MobileCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
}

function img(id: number, w = 800): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

export const CATEGORIES: MobileCategory[] = [
  { id: 'cat-bridal-lehengas', slug: 'bridal-lehengas', name: 'Bridal Lehengas', imageUrl: img(12411105, 600) },
  { id: 'cat-engagement-reception', slug: 'engagement-reception-lehengas', name: 'Engagement & Reception', imageUrl: img(30825616, 600) },
  { id: 'cat-party-wear', slug: 'party-wear-lehengas', name: 'Party Wear', imageUrl: img(13204680, 600) },
  { id: 'cat-sarees', slug: 'sarees', name: 'Sarees', imageUrl: img(20614154, 600) },
  { id: 'cat-anarkali-gowns', slug: 'anarkali-gowns', name: 'Anarkali & Gowns', imageUrl: img(16612752, 600) },
  { id: 'cat-indo-western', slug: 'indo-western-fusion', name: 'Indo-Western', imageUrl: img(19248233, 600) },
];

export const PRODUCTS: MobileProduct[] = [
  {
    id: 'prod-001', slug: 'maroon-zari-embroidered-bridal-lehenga',
    name: 'Maroon Zari Embroidered Bridal Lehenga Set',
    categoryId: 'cat-bridal-lehengas', categoryName: 'Bridal Lehengas',
    price: 68500, compareAtPrice: 82000, rating: 5.0, reviewCount: 2,
    imageUrl: img(12411105, 1200), imageUrl2: img(30723693, 1200),
    isBestseller: true,
    colors: [{ name: 'Maroon', hex: '#6E1E2C' }],
    sizes: ['S', 'M', 'L', 'XL', 'Custom'],
    fabric: 'Raw Silk', workDetails: 'Hand Zardozi, Zari and Dabka embroidery with stone work',
    description: 'A regal maroon bridal lehenga hand-embroidered with intricate zari, zardozi and dabka work across the skirt and blouse.',
  },
  {
    id: 'prod-002', slug: 'gold-kundan-bridal-lehenga-set',
    name: 'Gold Kundan Bridal Lehenga Set',
    categoryId: 'cat-bridal-lehengas', categoryName: 'Bridal Lehengas',
    price: 138000, compareAtPrice: 165000, rating: 4.8, reviewCount: 19,
    imageUrl: img(35586107, 1200), imageUrl2: img(12411105, 1200),
    isBestseller: true,
    colors: [{ name: 'Gold', hex: '#D4AF37' }, { name: 'Red', hex: '#A31621' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    fabric: 'Silk with Zari Embroidery', workDetails: 'Kundan, stone and sequin embroidery, all-over',
    description: 'Heavy kundan and stone-set bridal lehenga with a dense gold zari weave, designed for the main wedding ceremony.',
  },
  {
    id: 'prod-030', slug: 'champagne-sequin-reception-gown',
    name: 'Champagne Sequin Embellished Reception Gown',
    categoryId: 'cat-engagement-reception', categoryName: 'Engagement & Reception',
    price: 24500, compareAtPrice: 29900, rating: 0, reviewCount: 0,
    imageUrl: img(16612752, 1200), imageUrl2: img(19248233, 1200),
    isNewArrival: true,
    colors: [{ name: 'Champagne', hex: '#E9D8B4' }],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    fabric: 'Georgette', workDetails: 'All-over sequin embroidery',
    description: 'A flowing champagne reception gown finished with all-over sequin embroidery for a soft, glamorous evening silhouette.',
  },
  {
    id: 'prod-015', slug: 'emerald-green-sequin-party-lehenga',
    name: 'Emerald Green Sequin Party Lehenga',
    categoryId: 'cat-party-wear', categoryName: 'Party Wear',
    price: 19500, compareAtPrice: 24000, rating: 4.6, reviewCount: 20,
    imageUrl: img(13204680, 1200), imageUrl2: img(15751055, 1200),
    colors: [{ name: 'Emerald Green', hex: '#046307' }],
    sizes: ['S', 'M', 'L'],
    fabric: 'Georgette', workDetails: 'Scattered sequin embroidery',
    description: 'Light, easy-to-move sequin lehenga in emerald green, perfect for sangeet and cocktail nights.',
  },
  {
    id: 'prod-023', slug: 'red-banarasi-silk-saree',
    name: 'Red Banarasi Silk Saree with Zari Border',
    categoryId: 'cat-sarees', categoryName: 'Sarees',
    price: 24500, compareAtPrice: 29500, rating: 4.9, reviewCount: 38,
    imageUrl: img(20614154, 1200), imageUrl2: img(1444441, 1200),
    isBestseller: true,
    colors: [{ name: 'Red', hex: '#A31621' }],
    sizes: ['Free Size'],
    fabric: 'Banarasi Silk', workDetails: 'Handwoven temple-motif zari border',
    description: 'A genuine handwoven Banarasi silk saree with a dense temple-motif zari border and pallu.',
  },
  {
    id: 'prod-034', slug: 'black-sequin-cocktail-gown',
    name: 'Black Sequin Cocktail Gown',
    categoryId: 'cat-indo-western', categoryName: 'Indo-Western',
    price: 18500, compareAtPrice: 22500, rating: 4.5, reviewCount: 24,
    imageUrl: img(19248233, 1200), imageUrl2: img(16612752, 1200),
    colors: [{ name: 'Black', hex: '#1A1A1A' }],
    sizes: ['XS', 'S', 'M', 'L'],
    fabric: 'Crepe', workDetails: 'Sequin embroidered bodice',
    description: 'A sleek black cocktail gown with a sequin-embroidered bodice, cut for a modern reception look.',
  },
];

export interface MobileAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface MobileOrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface MobileOrderStatusEvent {
  status: string;
  timestamp: string;
  note?: string;
}

export interface MobileOrder {
  id: string;
  orderNumber: string;
  items: MobileOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: string;
  statusHistory: MobileOrderStatusEvent[];
  shippingAddress: MobileAddress;
  paymentMethod: string;
  placedAt: string;
  expectedDeliveryDate: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface SizeProfile {
  bust: number;
  waist: number;
  hip: number;
  shoulder: number;
  height: number;
  preferredSize: string;
  unit: 'in' | 'cm';
}

export const CURRENT_USER = {
  firstName: 'Ananya',
  lastName: 'Sharma',
  email: 'ananya.sharma@example.com',
  phone: '9810012345',
};

export const MOCK_ADDRESSES: MobileAddress[] = [
  {
    id: 'addr-001',
    label: 'Home',
    fullName: 'Ananya Sharma',
    phone: '9810012345',
    line1: 'B-42, Greater Kailash',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110048',
    isDefault: true,
  },
  {
    id: 'addr-002',
    label: 'Work',
    fullName: 'Ananya Sharma',
    phone: '9810012345',
    line1: 'Tower C, DLF Cyber City',
    line2: 'Sector 24',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122002',
    isDefault: false,
  },
];

export const MOCK_ORDERS: MobileOrder[] = [
  {
    id: 'order-001',
    orderNumber: 'OF-2026-100001',
    items: [
      {
        productId: 'prod-001',
        name: 'Maroon Zari Embroidered Bridal Lehenga Set',
        imageUrl: img(12411105, 400),
        size: 'M',
        color: 'Maroon',
        quantity: 1,
        unitPrice: 68500,
      },
    ],
    subtotal: 68500,
    shippingFee: 0,
    total: 60500,
    status: 'Delivered',
    statusHistory: [
      { status: 'Placed', timestamp: '2026-02-10T11:20:00Z' },
      { status: 'Confirmed', timestamp: '2026-02-11T09:00:00Z' },
      { status: 'Shipped', timestamp: '2026-02-14T10:00:00Z' },
      { status: 'Delivered', timestamp: '2026-02-16T16:50:00Z' },
    ],
    shippingAddress: MOCK_ADDRESSES[0],
    paymentMethod: 'UPI',
    placedAt: '2026-02-10T11:20:00Z',
    expectedDeliveryDate: '2026-02-19',
    trackingNumber: 'TRKOF100001IN',
    carrier: 'Delhivery',
  },
  {
    id: 'order-002',
    orderNumber: 'OF-2026-100002',
    items: [
      {
        productId: 'prod-023',
        name: 'Red Banarasi Silk Saree with Zari Border',
        imageUrl: img(20614154, 400),
        size: 'Free Size',
        color: 'Red',
        quantity: 1,
        unitPrice: 24500,
      },
    ],
    subtotal: 24500,
    shippingFee: 0,
    total: 22050,
    status: 'Shipped',
    statusHistory: [
      { status: 'Placed', timestamp: '2026-08-20T14:00:00Z' },
      { status: 'Confirmed', timestamp: '2026-08-20T18:00:00Z' },
      { status: 'Shipped', timestamp: '2026-08-22T09:00:00Z' },
    ],
    shippingAddress: MOCK_ADDRESSES[0],
    paymentMethod: 'Card',
    placedAt: '2026-08-20T14:00:00Z',
    expectedDeliveryDate: '2026-08-29',
    trackingNumber: 'TRKOF100002IN',
    carrier: 'Delhivery',
  },
];

export const DEFAULT_SIZE_PROFILE: SizeProfile = {
  bust: 36,
  waist: 30,
  hip: 39,
  shoulder: 14.5,
  height: 64,
  preferredSize: 'M',
  unit: 'in',
};

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    question: 'How do I choose the right size?',
    answer: 'Use our Size Guide on every product page, or save your measurements once under Account → Size Profile and we’ll suggest a size automatically.',
  },
  {
    question: 'Can I get a garment customized to my measurements?',
    answer: 'Yes — most bridal and party wear pieces offer Custom Size Alteration at checkout for an additional fee. Our tailoring team hand-finishes each order.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Standard delivery is 6–12 days depending on the piece; express delivery (where available) is 3–7 days. Exact estimates are shown on each product page.',
  },
  {
    question: 'What is your exchange and return policy?',
    answer: 'We offer a 7-day exchange window on eligible items from the date of delivery. Made-to-order and customized pieces are final sale.',
  },
  {
    question: 'Do you offer Cash on Delivery?',
    answer: 'Yes, COD is available on orders under ₹50,000 to most serviceable pincodes.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Go to Account → My Orders and tap any order to see live status and tracking details.',
  },
];
