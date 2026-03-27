import { ChangeDetectorRef, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, of, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeagueService } from '../../services/league.service';
import { Match } from '../../models/match.model';

interface Round {
  roundNumber: number;
  matches: Match[];
}

@Component({
  selector: 'app-league-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './league-results.component.html',
  styleUrl: './league-results.component.css',
})
export class LeagueResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueService = inject(LeagueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  rounds: Round[] = [];
  selectedRoundNumber = 2;
  loading = true;
  error: string | null = null;
  expandedMatchId: number | null = null;

  get selectedRound(): Round | null {
    return this.rounds.find((round) => round.roundNumber === this.selectedRoundNumber) ?? null;
  }

  ngOnInit(): void {
    this.loadResults(this.route.snapshot.paramMap);

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((params) => this.loadResults(params));
  }

  private loadResults(params: ParamMap): void {
    this.loading = true;
    this.error = null;
    this.rounds = [];
    this.expandedMatchId = null;

    const leagueId = Number(params.get('leagueId'));
    if (!Number.isFinite(leagueId)) {
      this.error = 'Неисправан ID лиге.';
      this.loading = false;
      return;
    }

    this.leagueService
      .getResults(leagueId)
      .pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању резултата.';
          return of([] as Match[]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((matches) => {
        try {
          this.rounds = this.groupByRound(matches);
          this.initializeSelectedRound();
        } catch {
          this.rounds = [];
          this.error = 'Грешка при обради резултата.';
        }
        this.cdr.detectChanges();
      });
  }

  selectRound(roundNumber: number): void {
    this.selectedRoundNumber = roundNumber;
    this.expandedMatchId = null;
  }

  toggleMatch(matchId: number): void {
    this.expandedMatchId = this.expandedMatchId === matchId ? null : matchId;
  }

  hasDetail(match: Match): boolean {
    return !!(match.goals?.length || match.quarters?.length || match.sets?.length);
  }

  parseTotalScore(result: string | null | undefined): [number, number] {
    const parts = result?.split(':') ?? [];
    return [parseInt(parts[0] ?? '0', 10), parseInt(parts[1] ?? '0', 10)];
  }

  getFirstHalfScore(match: Match): [number, number] {
    const firstHalf = (match.quarters ?? []).find((q) => q.quarterNumber === 1) ?? match.quarters?.[0] ?? null;
    return [firstHalf?.homeScore ?? 0, firstHalf?.awayScore ?? 0];
  }

  getSecondHalfScore(match: Match): [number, number] {
    const [totalHome, totalAway] = this.parseTotalScore(match.result);
    const [firstHalfHome, firstHalfAway] = this.getFirstHalfScore(match);
    return [totalHome - firstHalfHome, totalAway - firstHalfAway];
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
      .map(([roundNumber, matches]) => ({ roundNumber, matches }));
  }

  private initializeSelectedRound(): void {
    if (this.rounds.length === 0) {
      this.selectedRoundNumber = 2;
      return;
    }

    const hasRoundTwo = this.rounds.some((round) => round.roundNumber === 2);
    this.selectedRoundNumber = hasRoundTwo ? 2 : this.rounds[0].roundNumber;
  }
}
