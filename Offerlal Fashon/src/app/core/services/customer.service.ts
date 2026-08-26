import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Address, Customer, SizeProfile } from '../models';
import { DemoDataStoreService } from './demo-data-store.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private store = inject(DemoDataStoreService);

  getAll(): Observable<Customer[]> {
    return of(this.store.customers()).pipe(delay(200));
  }

  getById(id: string): Observable<Customer | undefined> {
    return of(this.store.customers().find((c) => c.id === id)).pipe(delay(200));
  }

  addAddress(customerId: string, address: Address): void {
    this.store.rawCustomers.update((list) =>
      list.map((c) =>
        c.id !== customerId
          ? c
          : {
              ...c,
              addresses: address.isDefault
                ? [...c.addresses.map((a) => ({ ...a, isDefault: false })), address]
                : [...c.addresses, address],
            },
      ),
    );
  }

  removeAddress(customerId: string, addressId: string): void {
    this.store.rawCustomers.update((list) =>
      list.map((c) => (c.id !== customerId ? c : { ...c, addresses: c.addresses.filter((a) => a.id !== addressId) })),
    );
  }

  saveSizeProfile(customerId: string, profile: SizeProfile): void {
    this.store.rawCustomers.update((list) => list.map((c) => (c.id !== customerId ? c : { ...c, sizeProfile: profile })));
  }
}
