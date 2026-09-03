import { Injectable, signal } from '@angular/core';
import { MOCK_ADDRESSES, MobileAddress } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly _addresses = signal<MobileAddress[]>([...MOCK_ADDRESSES]);
  readonly addresses = this._addresses.asReadonly();

  add(address: Omit<MobileAddress, 'id'>): void {
    const newAddr: MobileAddress = { ...address, id: `addr-${Date.now()}` };
    this._addresses.update((list) => [...list, newAddr]);
  }

  remove(id: string): void {
    this._addresses.update((list) => list.filter((a) => a.id !== id));
  }

  setDefault(id: string): void {
    this._addresses.update((list) => list.map((a) => ({ ...a, isDefault: a.id === id })));
  }
}
