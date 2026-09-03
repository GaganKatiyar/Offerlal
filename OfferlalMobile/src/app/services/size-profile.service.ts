import { Injectable, signal } from '@angular/core';
import { DEFAULT_SIZE_PROFILE, SizeProfile } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class SizeProfileService {
  private readonly _profile = signal<SizeProfile | null>(null);
  readonly profile = this._profile.asReadonly();

  save(profile: SizeProfile): void {
    this._profile.set(profile);
  }

  seedDefault(): SizeProfile {
    return { ...DEFAULT_SIZE_PROFILE };
  }
}
