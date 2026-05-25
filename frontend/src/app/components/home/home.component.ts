import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, catchError, of, forkJoin } from 'rxjs';
import { LeagueService } from '../../services/league.service';
import { SportKey, SportSelectionService, VolleyballGender } from '../../services/sport-selection.service';
import { StandingsRow } from '../../models/standings-row.model';
import { RouterLink } from '@angular/router';
import { Match } from '../../models/match.model';

interface Round {
  roundNumber: number;
  matches: Match[];
}

const FALLBACK_SPORT_LEAGUE_MAP: Record<string, number> = {
  football: -1,
  basketball: -4,
  'volleyball-male': -2,
  'volleyball-female': -3,
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly leagueService = inject(LeagueService);
  private readonly sportSelection = inject(SportSelectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  rows: StandingsRow[] = [];
  resultsRounds: Round[] = [];
  scheduleRounds: Round[] = [];
  currentRound: Round | null = null;
  nextRound: Round | null = null;
  // Overviews for all sports shown on homepage
  sportOverviews: Array<{
    key: string;
    sport: SportKey;
    gender?: VolleyballGender;
    currentRound: Round | null;
    nextRound: Round | null;
    loading: boolean;
  }> = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.sportSelection.selection$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((sel) => {
          this.loading = true;
          this.error = null;
          this.rows = [];
          this.resultsRounds = [];
          this.scheduleRounds = [];
          this.currentRound = null;
          this.nextRound = null;
          this.cdr.detectChanges();

          const leagueId = this.resolveLeagueId(sel.sport, sel.gender);
          if (leagueId === null) {
            this.error = 'Није могуће одредити лигу за изабрани спорт.';
            return of({
              standings: [] as StandingsRow[],
              results: [] as Match[],
              schedule: [] as Match[],
            }).pipe(
              finalize(() => {
                this.loading = false;
                this.cdr.detectChanges();
              }),
            );
          }

          return forkJoin({
            standings: this.leagueService.getStandings(sel.sport, sel.gender).pipe(
              catchError(() => {
                this.error = 'Грешка при учитавању података за почетну страницу.';
                return of([] as StandingsRow[]);
              }),
            ),
            results: this.leagueService.getResults(leagueId).pipe(
              catchError(() => {
                this.error = 'Грешка при учитавању података за почетну страницу.';
                return of([] as Match[]);
              }),
            ),
            schedule: this.leagueService.getSchedule(leagueId).pipe(
              catchError(() => {
                this.error = 'Грешка при учитавању података за почетну страницу.';
                return of([] as Match[]);
              }),
            ),
          }).pipe(
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            }),
          );
        }),
      )
      .subscribe((payload) => {
        this.rows = payload.standings ?? [];

        this.resultsRounds = this.groupByRound(payload.results ?? []);
        this.scheduleRounds = this.groupByRound(payload.schedule ?? []);
        
        this.currentRound = this.mergeRounds(
          this.resolveSelectedRound(this.resultsRounds, 5),
          this.resolveSelectedRound(this.scheduleRounds, 5)
        );
        this.nextRound = this.resolveSelectedRound(this.scheduleRounds, 6);

        this.cdr.detectChanges();
      });

    // load small overviews for all sports once
    this.loadSportOverviews();
  }

  private loadSportOverviews(): void {
    const overviewKeys = [
      { sport: 'football' as SportKey },
      { sport: 'basketball' as SportKey },
      { sport: 'volleyball' as SportKey, gender: 'male' as VolleyballGender },
      { sport: 'volleyball' as SportKey, gender: 'female' as VolleyballGender },
    ];

    this.sportOverviews = overviewKeys.map((k) => ({
      key: `${k.sport}${k.gender ? '-' + k.gender : ''}`,
      sport: k.sport,
      gender: k.gender,
      currentRound: null,
      nextRound: null,
      loading: true,
    }));

    for (const overview of this.sportOverviews) {
      const leagueId = this.resolveLeagueId(overview.sport, overview.gender);
      if (leagueId === null) {
        overview.loading = false;
        continue;
      }

      forkJoin({
        results: this.leagueService.getResults(leagueId).pipe(catchError(() => of([] as Match[]))),
        schedule: this.leagueService.getSchedule(leagueId).pipe(catchError(() => of([] as Match[]))),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(({ results, schedule }) => {
          try {
            const resultsRounds = this.groupByRoundNoFilter(results);
            const scheduleRounds = this.groupByRoundNoFilter(schedule);

            const lastPlayed = resultsRounds.length > 0 ? Math.max(...resultsRounds.map((r) => r.roundNumber)) : null;
            const candidateCurrent = lastPlayed ?? (scheduleRounds.length > 0 ? scheduleRounds[0].roundNumber : null);

            if (candidateCurrent !== null) {
              const rRound = resultsRounds.find((r) => r.roundNumber === candidateCurrent) ?? null;
              const sRound = scheduleRounds.find((r) => r.roundNumber === candidateCurrent) ?? null;
              overview.currentRound = this.mergeRounds(rRound, sRound);
            }

            if (overview.currentRound) {
              overview.nextRound = scheduleRounds.find((r) => r.roundNumber === overview.currentRound!.roundNumber + 1) ?? null;
            } else {
              overview.nextRound = scheduleRounds.length > 0 ? scheduleRounds[0] : null;
            }
          } catch {
            overview.currentRound = null;
            overview.nextRound = null;
          }
          overview.loading = false;
          this.cdr.detectChanges();
        });
    }
  }

  // reuse helper: group without filtering
  private groupByRoundNoFilter(matches: Match[]): Round[] {
    const map = new Map<number, Match[]>();
    for (const match of matches ?? []) {
      if (!match || typeof match.roundNumber !== 'number') {
        continue;
      }
      const existing = map.get(match.roundNumber) ?? [];
      existing.push(match);
      map.set(match.roundNumber, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, matches]) => ({ roundNumber, matches }));
  }

  isVolleyball(): boolean {
    return this.sportSelection.snapshot.sport === 'volleyball';
  }

  isFootball(): boolean {
    return this.sportSelection.snapshot.sport === 'football';
  }

  isBasketball(): boolean {
    return this.sportSelection.snapshot.sport === 'basketball';
  }

  formatRatio(left: number | null | undefined, right: number | null | undefined): string {
    if (left === null || left === undefined || right === null || right === undefined) {
      return '-';
    }
    return `${left}:${right}`;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2216%22 y=%2221%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23999%22%3E%3F%3C/text%3E%3C/svg%3E';
  }

  private groupByRound(matches: Match[]): Round[] {
    const map = new Map<number, Match[]>();
    for (const match of matches ?? []) {
      if (!match || typeof match.roundNumber !== 'number') {
        continue;
      }
      const existing = map.get(match.roundNumber) ?? [];
      existing.push(match);
      map.set(match.roundNumber, existing);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, roundMatches]) => ({ roundNumber, matches: roundMatches }));
  }

  private resolveSelectedRound(rounds: Round[], roundNumber: number): Round | null {
    return rounds.find((round) => round.roundNumber === roundNumber) ?? null;
  }

  private mergeRounds(resultsRound: Round | null, scheduleRound: Round | null): Round | null {
    if (!resultsRound && !scheduleRound) {
      return null;
    }

    const roundNumber = resultsRound?.roundNumber ?? scheduleRound!.roundNumber;
    const matchMap = new Map<number, Match>();

    scheduleRound?.matches.forEach((match) => {
      matchMap.set(match.id, match);
    });

    resultsRound?.matches.forEach((match) => {
      matchMap.set(match.id, match);
    });

    return {
      roundNumber,
      matches: Array.from(matchMap.values()),
    };
  }

  private resolveLeagueId(sport: SportKey, gender?: VolleyballGender): number | null {
    const fallbackKey = sport === 'volleyball' ? `volleyball-${gender ?? 'male'}` : sport;
    return FALLBACK_SPORT_LEAGUE_MAP[fallbackKey] ?? null;
  }
}
