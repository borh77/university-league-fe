import { Injectable, computed, signal } from '@angular/core';
import { GenderKey, SportKey, LeagueListItem } from '../models/league.model';

type Selection = {
  sport: SportKey;
  gender: GenderKey | null;
  leagueId: number | null;
};

const STORAGE_KEY = 'unileague.selection.v1';

@Injectable({ providedIn: 'root' })
export class LeagueContextService {
  private readonly selectionSig = signal<Selection>(this.loadInitial());

  selection = computed(() => this.selectionSig());
  sport = computed(() => this.selectionSig().sport);
  gender = computed(() => this.selectionSig().gender);
  leagueId = computed(() => this.selectionSig().leagueId);

  setSelection(next: Partial<Selection>) {
    const merged: Selection = { ...this.selectionSig(), ...next };
    this.selectionSig.set(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }

  hydrateLeagueIdFromLeagues(leagues: LeagueListItem[]) {
    const s = this.selectionSig();

    // nađi ligu za sport + gender (gender samo za volleyball)
    const match = leagues.find(l =>
      l.sport === s.sport &&
      (s.sport !== 'volleyball' || (l.gender ?? null) === (s.gender ?? null))
    );

    this.setSelection({ leagueId: match?.id ?? null });
  }

  private loadInitial(): Selection {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Selection;
    } catch { }
    // default
    return { sport: 'football', gender: null, leagueId: null };
  }
}
