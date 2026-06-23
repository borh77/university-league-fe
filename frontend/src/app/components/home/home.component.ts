import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, catchError, of, forkJoin } from 'rxjs';
import { LeagueService } from '../../services/league.service';
import { SportKey, SportSelectionService, VolleyballGender } from '../../services/sport-selection.service';
import { StandingsRow } from '../../models/standings-row.model';
import { RouterLink } from '@angular/router';
import { Match, splitRegularAndPlayoff } from '../../models/match.model';

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

        const resultSplit = splitRegularAndPlayoff(payload.results ?? []);
        const scheduleSplit = splitRegularAndPlayoff(payload.schedule ?? []);

        this.resultsRounds = this.groupByRound(resultSplit.regularSeasonMatches);
        this.scheduleRounds = this.groupByRound(scheduleSplit.regularSeasonMatches);

        const selectedRounds = this.resolveCurrentAndNextRounds(this.scheduleRounds);
        this.currentRound = selectedRounds.currentRound
          ? this.mergeRounds(
              this.resolveSelectedRound(this.resultsRounds, selectedRounds.currentRound.roundNumber),
              selectedRounds.currentRound,
            )
          : null;
        this.nextRound = selectedRounds.nextRound;

        this.cdr.detectChanges();
      });

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

  private resolveCurrentAndNextRounds(rounds: Round[], referenceDate = new Date()): {
    currentRound: Round | null;
    nextRound: Round | null;
  } {
    const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const weekBounds = this.getWeekBounds(referenceDate);

    const currentWeekRound = sortedRounds.find((round) => this.roundIntersectsRange(round, weekBounds.start, weekBounds.end));
    const currentRound =
      currentWeekRound ??
      [...sortedRounds]
        .reverse()
        .find((round) => {
          const roundStart = this.getRoundStart(round);
          return roundStart !== null && roundStart <= referenceDate;
        }) ??
      null;

    const currentEnd = currentRound ? this.getRoundEnd(currentRound) ?? weekBounds.end : weekBounds.end;
    const nextRound =
      sortedRounds.find((round) => {
        const roundStart = this.getRoundStart(round);
        return roundStart !== null && roundStart > currentEnd;
      }) ?? null;

    return { currentRound, nextRound };
  }

  private getWeekBounds(referenceDate: Date): { start: Date; end: Date } {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private roundIntersectsRange(round: Round, start: Date, end: Date): boolean {
    return round.matches.some((match) => {
      const date = new Date(match.scheduledAt);
      return !Number.isNaN(date.getTime()) && date >= start && date <= end;
    });
  }

  private getRoundStart(round: Round): Date | null {
    const dates = round.matches
      .map((match) => new Date(match.scheduledAt))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (dates.length === 0) {
      return null;
    }

    return dates.reduce((earliest, current) => (current < earliest ? current : earliest));
  }

  private getRoundEnd(round: Round): Date | null {
    const dates = round.matches
      .map((match) => new Date(match.scheduledAt))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (dates.length === 0) {
      return null;
    }

    return dates.reduce((latest, current) => (current > latest ? current : latest));
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
