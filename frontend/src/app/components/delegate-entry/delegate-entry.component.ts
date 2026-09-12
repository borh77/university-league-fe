import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, of, tap } from 'rxjs';
import { LeagueService } from '../../services/league.service';
import { DelegateService } from '../../services/delegate.service';
import { Match } from '../../models/match.model';
import {
  DelegateMatch,
  GoalEntry,
  Player,
  PlayerStatInput,
  QuarterScore,
  SetScore,
  SubmitMatchResult,
} from '../../models/delegate-match.model';
import { NumberStepperComponent } from '../shared/number-stepper/number-stepper.component';

interface GoalRow {
  isHomeTeamGoal: boolean;
  playerId: number | null;
  minute: number;
}

interface PlayerPointsRow {
  player: Player;
  points: number;
  played: boolean;
}

@Component({
  selector: 'app-delegate-entry',
  standalone: true,
  imports: [CommonModule, NumberStepperComponent],
  templateUrl: './delegate-entry.component.html',
  styleUrl: './delegate-entry.component.css',
})
export class DelegateEntryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueService = inject(LeagueService);
  private readonly delegateService = inject(DelegateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  leagueId = 0;

  // Lista mečeva bez rezultata
  loading = true;
  error: string | null = null;
  pendingMatches: Match[] = [];

  // Forma za izabrani meč
  selectedMatchId: number | null = null;
  matchLoading = false;
  matchError: string | null = null;
  match: DelegateMatch | null = null;

  quarters: QuarterScore[] = [];
  sets: SetScore[] = [];
  goalRows: GoalRow[] = [];
  homePlayerPoints: PlayerPointsRow[] = [];
  awayPlayerPoints: PlayerPointsRow[] = [];

  noGoalsConfirmed = false;

  submitting = false;
  submitError: string | null = null;
  submitted = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadMatches(params));
  }

  private loadMatches(params: ParamMap): void {
    this.loading = true;
    this.error = null;
    this.pendingMatches = [];
    this.selectedMatchId = null;
    this.match = null;

    const leagueId = Number(params.get('leagueId'));
    if (!Number.isFinite(leagueId)) {
      this.error = 'Неисправан ID лиге.';
      this.loading = false;
      return;
    }
    this.leagueId = leagueId;

    this.leagueService
      .getSchedule(leagueId)
      .pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању мечева.';
          return of([] as Match[]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((matches) => {
        this.pendingMatches = (matches ?? [])
          .filter((m) => !m?.result)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        this.cdr.detectChanges();
      });
  }

  selectMatch(matchId: number): void {
    this.selectedMatchId = matchId;
    this.matchLoading = true;
    this.matchError = null;
    this.match = null;
    this.submitted = false;
    this.submitError = null;

    this.delegateService
      .getMatch(matchId)
      .pipe(
        catchError(() => {
          this.matchError = 'Грешка при учитавању меча.';
          return of(null);
        }),
        finalize(() => {
          this.matchLoading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((match) => {
        if (match) {
          this.match = match;
          this.initializeForm(match);
        }
        this.cdr.detectChanges();
      });
  }

  backToList(): void {
    this.selectedMatchId = null;
    this.match = null;
  }

  playerLabel(player: Player): string {
    return `${player.jerseyNumber} ${player.firstName} ${player.lastName}`;
  }

  private initializeForm(match: DelegateMatch): void {
    this.quarters = [];
    this.sets = [];
    this.goalRows = [];
    this.homePlayerPoints = [];
    this.awayPlayerPoints = [];
    this.noGoalsConfirmed = false;

    if (match.sport === 'Basketball') {
      this.quarters = [1, 2, 3, 4].map((n) => ({ quarterNumber: n, homeScore: 0, awayScore: 0 }));
      this.homePlayerPoints = match.homeRoster.map((player) => ({ player, points: 0, played: false }));
      this.awayPlayerPoints = match.awayRoster.map((player) => ({ player, points: 0, played: false }));
    } else if (match.sport === 'Volleyball') {
      this.sets = [1, 2, 3].map((n) => ({ setNumber: n, homeScore: 0, awayScore: 0 }));
      this.homePlayerPoints = match.homeRoster.map((player) => ({ player, points: 0, played: false }));
      this.awayPlayerPoints = match.awayRoster.map((player) => ({ player, points: 0, played: false }));
    }
  }

  setHomePoints(index: number, points: number): void {
    this.homePlayerPoints = this.withPoints(this.homePlayerPoints, index, points);
  }

  setAwayPoints(index: number, points: number): void {
    this.awayPlayerPoints = this.withPoints(this.awayPlayerPoints, index, points);
  }

  toggleHomePlayed(index: number, played: boolean): void {
    this.homePlayerPoints = this.withPlayed(this.homePlayerPoints, index, played);
  }

  toggleAwayPlayed(index: number, played: boolean): void {
    this.awayPlayerPoints = this.withPlayed(this.awayPlayerPoints, index, played);
  }

  private withPoints(rows: PlayerPointsRow[], index: number, points: number): PlayerPointsRow[] {
    const current = rows[index];
    const updated: PlayerPointsRow = {
      ...current,
      points,
      // Igrač koji je postigao poene je automatski "igrao" - ne traziti dodatni tap
      played: points > 0 ? true : current.played,
    };
    return rows.map((row, i) => (i === index ? updated : row));
  }

  private withPlayed(rows: PlayerPointsRow[], index: number, played: boolean): PlayerPointsRow[] {
    return rows.map((row, i) => (i === index ? { ...row, played } : row));
  }

  // ── Košarka ──────────────────────────────────────────────
  get basketballHomeScore(): number {
    return this.quarters.reduce((sum, q) => sum + q.homeScore, 0);
  }

  get basketballAwayScore(): number {
    return this.quarters.reduce((sum, q) => sum + q.awayScore, 0);
  }

  get homePointsSum(): number {
    return this.homePlayerPoints.reduce((sum, row) => sum + row.points, 0);
  }

  get awayPointsSum(): number {
    return this.awayPlayerPoints.reduce((sum, row) => sum + row.points, 0);
  }

  addOvertimeQuarter(): void {
    this.quarters.push({ quarterNumber: this.quarters.length + 1, homeScore: 0, awayScore: 0 });
  }

  setQuarterHome(index: number, value: number): void {
    this.quarters[index] = { ...this.quarters[index], homeScore: value };
  }

  setQuarterAway(index: number, value: number): void {
    this.quarters[index] = { ...this.quarters[index], awayScore: value };
  }

  get basketballValid(): boolean {
    return (
      this.homePointsSum === this.basketballHomeScore &&
      this.awayPointsSum === this.basketballAwayScore &&
      (this.basketballHomeScore > 0 || this.basketballAwayScore > 0)
    );
  }

  // ── Odbojka ──────────────────────────────────────────────
  get volleyballHomeSets(): number {
    return this.sets.filter((s) => s.homeScore > s.awayScore).length;
  }

  get volleyballAwaySets(): number {
    return this.sets.filter((s) => s.awayScore > s.homeScore).length;
  }

  get volleyballHomePoints(): number {
    return this.sets.reduce((sum, s) => sum + s.homeScore, 0);
  }

  get volleyballAwayPoints(): number {
    return this.sets.reduce((sum, s) => sum + s.awayScore, 0);
  }

  get hasTiedSet(): boolean {
    return this.sets.some((s) => s.homeScore === s.awayScore && (s.homeScore > 0 || s.awayScore > 0));
  }

  // Odbojka se igra na tri dobijena seta
  get volleyballMatchComplete(): boolean {
    return this.volleyballHomeSets === 3 || this.volleyballAwaySets === 3;
  }

  addSet(): void {
    if (this.sets.length >= 5) return;
    this.sets.push({ setNumber: this.sets.length + 1, homeScore: 0, awayScore: 0 });
  }

  removeSet(): void {
    if (this.sets.length <= 1) return;
    this.sets = this.sets.slice(0, -1);
  }

  setSetHome(index: number, value: number): void {
    this.sets[index] = { ...this.sets[index], homeScore: value };
  }

  setSetAway(index: number, value: number): void {
    this.sets[index] = { ...this.sets[index], awayScore: value };
  }

  get volleyballValid(): boolean {
    return (
      !this.hasTiedSet &&
      this.volleyballMatchComplete &&
      this.homePointsSum === this.volleyballHomePoints &&
      this.awayPointsSum === this.volleyballAwayPoints
    );
  }

  // ── Fudbal ───────────────────────────────────────────────
  get footballHomeGoals(): number {
    return this.goalRows.filter((g) => g.isHomeTeamGoal).length;
  }

  get footballAwayGoals(): number {
    return this.goalRows.filter((g) => !g.isHomeTeamGoal).length;
  }

  addGoal(isHomeTeamGoal: boolean): void {
    const roster = isHomeTeamGoal ? this.match?.homeRoster : this.match?.awayRoster;
    this.goalRows = [
      ...this.goalRows,
      { isHomeTeamGoal, playerId: roster?.[0]?.id ?? null, minute: 1 },
    ];
  }

  removeGoal(index: number): void {
    this.goalRows = this.goalRows.filter((_, i) => i !== index);
  }

  setGoalMinute(index: number, value: number): void {
    this.goalRows[index] = { ...this.goalRows[index], minute: value };
  }

  setGoalPlayer(index: number, playerId: number): void {
    this.goalRows[index] = { ...this.goalRows[index], playerId };
  }

  get isGoallessDraw(): boolean {
    return this.footballHomeGoals === 0 && this.footballAwayGoals === 0;
  }

  get footballValid(): boolean {
    if (this.isGoallessDraw) return this.noGoalsConfirmed;
    return this.goalRows.every((g) => g.playerId !== null);
  }

  // ── Slanje ───────────────────────────────────────────────
  get canSubmit(): boolean {
    if (!this.match) return false;
    switch (this.match.sport) {
      case 'Basketball':
        return this.basketballValid;
      case 'Volleyball':
        return this.volleyballValid;
      default:
        return this.footballValid;
    }
  }

  submit(): void {
    if (!this.match || !this.canSubmit || this.submitting) return;

    const request = this.buildRequest(this.match);
    const currentParams = this.route.snapshot.paramMap;

    this.submitting = true;
    this.submitError = null;

    this.delegateService
      .submitResult(this.match.id, request)
      .pipe(
        tap(() => {
          this.submitted = true;
          this.match = null;
          this.selectedMatchId = null;
        }),
        catchError(() => {
          this.submitError = 'Грешка при чувању резултата. Проверите унете вредности.';
          return EMPTY;
        }),
        finalize(() => {
          this.submitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.loadMatches(currentParams);
      });
  }

  private buildRequest(match: DelegateMatch): SubmitMatchResult {
    const playerStats: PlayerStatInput[] = [
      ...this.homePlayerPoints
        .filter((row) => row.played)
        .map((row) => ({ playerId: row.player.id, isHomeTeam: true, points: row.points })),
      ...this.awayPlayerPoints
        .filter((row) => row.played)
        .map((row) => ({ playerId: row.player.id, isHomeTeam: false, points: row.points })),
    ];

    if (match.sport === 'Basketball') {
      return {
        homeScore: this.basketballHomeScore,
        awayScore: this.basketballAwayScore,
        quarters: this.quarters,
        playerStats,
      };
    }

    if (match.sport === 'Volleyball') {
      return {
        homeScore: this.volleyballHomeSets,
        awayScore: this.volleyballAwaySets,
        sets: this.sets,
        playerStats,
      };
    }

    const goals: GoalEntry[] = this.goalRows.map((row) => {
      const roster = row.isHomeTeamGoal ? match.homeRoster : match.awayRoster;
      const player = roster.find((p) => p.id === row.playerId);
      return {
        scorerName: player ? `${player.firstName} ${player.lastName}` : '',
        teamName: row.isHomeTeamGoal ? match.homeTeamName : match.awayTeamName,
        isHomeTeamGoal: row.isHomeTeamGoal,
        minute: row.minute,
      };
    });

    return {
      homeScore: this.footballHomeGoals,
      awayScore: this.footballAwayGoals,
      goals: goals.length > 0 ? goals : undefined,
    };
  }
}
