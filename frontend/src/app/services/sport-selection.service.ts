import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SportKey = 'football' | 'basketball' | 'handball' | 'volleyball';
export type VolleyballGender = 'male' | 'female';

export interface SportSelection {
  sport: SportKey;
  gender?: VolleyballGender; // koristi se samo za volleyball
}

@Injectable({ providedIn: 'root' })
export class SportSelectionService {
  private readonly _selection$ = new BehaviorSubject<SportSelection>({
    sport: 'football',
    gender: 'male', // default za volleyball (ne smeta za non-volleyball)
  });

  readonly selection$ = this._selection$.asObservable();

  get snapshot(): SportSelection {
    return this._selection$.value;
  }

  setSport(sport: SportKey): void {
    const current = this._selection$.value;

    if (sport === 'volleyball') {
      // Ako prelaziš na volleyball a nema gender -> postavi default
      this._selection$.next({
        sport,
        gender: current.gender ?? 'male',
      });
      return;
    }

    // Za non-volleyball ignorisemo gender
    this._selection$.next({ sport });
  }

  setVolleyballGender(gender: VolleyballGender): void {
    const current = this._selection$.value;

    // Gender ima smisla samo kad je volleyball aktivan
    if (current.sport !== 'volleyball') {
      this._selection$.next({ sport: 'volleyball', gender });
      return;
    }

    this._selection$.next({ ...current, gender });
  }
}
