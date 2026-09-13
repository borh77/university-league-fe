import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { LeagueService } from './league.service';
import { LeagueListItem } from '../models/league.model';
import { SportKey, VolleyballGender } from './sport-selection.service';

@Injectable({ providedIn: 'root' })
export class LeagueLookupService {
  private readonly leagueService = inject(LeagueService);

  // Ucitava se samo jednom po zivotu aplikacije, deli se izmedju svih pretplatnika
  private readonly leagues$: Observable<LeagueListItem[]> = this.leagueService.getLeagues().pipe(
    catchError(() => of([] as LeagueListItem[])),
    shareReplay(1),
  );

  resolveLeagueId(sport: SportKey, gender?: VolleyballGender): Observable<number | null> {
    return this.leagues$.pipe(
      map((leagues) => {
        const match = leagues.find(
          (l) =>
            l.sport === sport &&
            (sport !== 'volleyball' || (l.gender ?? null) === (gender ?? null)),
        );
        return match?.id ?? null;
      }),
    );
  }

  resolveSportAndGender(
    leagueId: number,
  ): Observable<{ sport: SportKey; gender?: VolleyballGender } | null> {
    return this.leagues$.pipe(
      map((leagues) => {
        const match = leagues.find((l) => l.id === leagueId);
        if (!match) return null;
        return { sport: match.sport, gender: match.gender ?? undefined };
      }),
    );
  }
}
