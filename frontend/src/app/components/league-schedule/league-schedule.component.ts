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
          // Show only matches without a recorded result (upcoming/not played yet)
          const upcomingMatches = (schedule ?? []).filter((m) => !m?.result);
          this.rounds = this.groupByRound(upcomingMatches);
          this.selectedRoundNumber = this.resolveCurrentRound(this.rounds)?.roundNumber ?? this.rounds[0]?.roundNumber ?? 0;
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
      const existing = map.get(match.roundNumber) ?? [];
      existing.push(match);
      map.set(match.roundNumber, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, matches]) => ({ roundNumber, matches }));
  }

  private initializeSelectedRound(): void {
    this.selectedRoundNumber = this.rounds[0]?.roundNumber ?? 0;
  }

  private resolveCurrentRound(rounds: Round[], referenceDate = new Date()): Round | null {
    const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const weekBounds = this.getWeekBounds(referenceDate);

    return (
      sortedRounds.find((round) => this.roundIntersectsRange(round, weekBounds.start, weekBounds.end)) ??
      [...sortedRounds]
        .reverse()
        .find((round) => {
          const roundStart = this.getRoundStart(round);
          return roundStart !== null && roundStart <= referenceDate;
        }) ??
      null
    );
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
}
