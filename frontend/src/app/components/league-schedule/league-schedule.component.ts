import { ChangeDetectorRef, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, of, finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeagueService } from '../../services/league.service';
import { Match } from '../../models/match.model';

interface Round {
  roundNumber: number;
  matches: Match[];
}

@Component({
  selector: 'app-league-schedule',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './league-schedule.component.html',
  styleUrl: './league-schedule.component.css',
})
export class LeagueScheduleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueService = inject(LeagueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  rounds: Round[] = [];
  selectedRoundNumber = 0;
  loading = true;
  error: string | null = null;

  // New: current and next round views
  resultsRounds: Round[] = [];
  scheduleRounds: Round[] = [];
  currentRound: Round | null = null;
  nextRound: Round | null = null;

  get selectedRound(): Round | null {
    return this.rounds.find((round) => round.roundNumber === this.selectedRoundNumber) ?? null;
  }

  ngOnInit(): void {
    this.loadSchedule(this.route.snapshot.paramMap);

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((params) => this.loadSchedule(params));
  }

  private loadSchedule(params: ParamMap): void {
    this.loading = true;
    this.error = null;
    this.rounds = [];

    const leagueId = Number(params.get('leagueId'));
    if (!Number.isFinite(leagueId)) {
      this.error = 'Неисправан ID лиге.';
      this.loading = false;
      return;
    }

    // Fetch both results and schedule so we can determine current and next rounds
    forkJoin({
      results: this.leagueService.getResults(leagueId).pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању распореда.';
          return of([] as Match[]);
        }),
      ),
      schedule: this.leagueService.getSchedule(leagueId).pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању распореда.';
          return of([] as Match[]);
        }),
      ),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ results, schedule }) => {
        try {
          this.resultsRounds = this.groupByRoundNoFilter(results);
          this.scheduleRounds = this.groupByRoundNoFilter(schedule);

          // determine current round = last played round merged with schedule if present
          const lastPlayed = this.resultsRounds.length > 0 ? Math.max(...this.resultsRounds.map(r => r.roundNumber)) : null;
          const candidateCurrent = lastPlayed ?? (this.scheduleRounds.length > 0 ? this.scheduleRounds[0].roundNumber : null);

          if (candidateCurrent !== null) {
            const resultsRound = this.resultsRounds.find(r => r.roundNumber === candidateCurrent) ?? null;
            const scheduleRound = this.scheduleRounds.find(r => r.roundNumber === candidateCurrent) ?? null;
            this.currentRound = this.mergeRounds(resultsRound, scheduleRound);
          } else {
            this.currentRound = null;
          }

          // next round: schedule round with roundNumber = current + 1
          if (this.currentRound) {
            this.nextRound = this.scheduleRounds.find(r => r.roundNumber === this.currentRound!.roundNumber + 1) ?? null;
          } else {
            this.nextRound = this.scheduleRounds.length > 0 ? this.scheduleRounds[0] : null;
          }

          // keep the old rounds list for manual selection (only upcoming without results)
          this.rounds = this.groupByRound(schedule);

          // if we detected a currentRound, move it to the front of the selector list
          if (this.currentRound) {
            const idx = this.rounds.findIndex(r => r.roundNumber === this.currentRound!.roundNumber);
            if (idx > 0) {
              const [r] = this.rounds.splice(idx, 1);
              this.rounds.unshift(r);
            }
            this.selectedRoundNumber = this.currentRound!.roundNumber;
          } else {
            this.initializeSelectedRound();
          }
        } catch {
          this.rounds = [];
          this.error = 'Грешка при обради распореда.';
        }
        this.cdr.detectChanges();
      });
  }

  selectRound(roundNumber: number): void {
    this.selectedRoundNumber = roundNumber;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null; // prevent infinite loop if placeholder also fails
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2216%22 y=%2221%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23999%22%3E%3F%3C/text%3E%3C/svg%3E';
  }

  private groupByRound(matches: Match[]): Round[] {
    const map = new Map<number, Match[]>();
    for (const match of matches ?? []) {
      if (!match || typeof match.roundNumber !== 'number') {
        continue;
      }
      // for the schedule-specific grouping we skip matches that already have results
      if (this.hasResult(match)) {
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

  // Group rounds without filtering out played matches (used for computing current round)
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

  private hasResult(match: Match): boolean {
    return typeof match.result === 'string' && match.result.trim().length > 0;
  }

  private initializeSelectedRound(): void {
    if (this.rounds.length === 0) {
      this.selectedRoundNumber = 0;
      return;
    }

    // Default to the first available round if none selected earlier
    this.selectedRoundNumber = this.rounds[0].roundNumber;
  }
}
