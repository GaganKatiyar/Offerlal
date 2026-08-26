import { Address } from './address.model';
import { SizeProfile } from './size-profile.model';

export type CustomerSegment = 'New' | 'Repeat' | 'VIP' | 'Bridal' | 'High-Value';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  registeredAt: string;
  segment: CustomerSegment;
  totalOrders: number;
  totalSpend: number;
  addresses: Address[];
  sizeProfile?: SizeProfile;
  avatarUrl?: string;
}
