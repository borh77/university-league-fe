import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { LeagueService } from '../../services/league.service';
import { DelegateService } from '../../services/delegate.service';
import { AdminLeague, AdminTeam } from '../../models/admin.model';
import { isPlayoffMatch, Match } from '../../models/match.model';
import { DelegateMatch, SubmitMatchResult } from '../../models/delegate-match.model';
import { MatchResultFormComponent } from '../match-result-form/match-result-form.component';

interface Round {
  roundNumber: number;
  matches: Match[];
}

type MatchAction = 'reschedule' | 'teams' | 'result';

const SPORT_LABELS: Record<string, string> = {
  Football: 'Фудбал',
  Basketball: 'Кошарка',
  Volleyball: 'Одбојка',
  Handball: 'Рукомет',
};

@Component({
  selector: 'app-admin-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, MatchResultFormComponent],
  templateUrl: './admin-schedule.component.html',
  styleUrl: './admin-schedule.component.css',
})
export class AdminScheduleComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly leagueService = inject(LeagueService);
  private readonly delegateService = inject(DelegateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  // Lige
  loading = true;
  error: string | null = null;
  leagues: AdminLeague[] = [];
  selectedLeagueId: number | null = null;

  // Timovi u ligi + svi timovi (za dodavanje)
  leagueTeams: AdminTeam[] = [];
  leagueTeamsLoading = false;
  allTeams: AdminTeam[] = [];

  addTeamId: number | null = null;
  addTeamSubmitting = false;
  addTeamError: string | null = null;
  addTeamSuccess = false;

  // Zakazivanje novog meca
  scheduleRoundNumber: number | null = null;
  scheduleHomeTeamId: number | null = null;
  scheduleAwayTeamId: number | null = null;
  scheduleAt = '';
  scheduleSubmitting = false;
  scheduleError: string | null = null;

  // Raspored po kolima
  matchesLoading = false;
  matchesError: string | null = null;
  rounds: Round[] = [];
  selectedRoundNumber = 0;

  // Akcije nad pojedinacnim mecom - samo jedna otvorena panela odjednom
  expandedMatchId: number | null = null;
  expandedAction: MatchAction | null = null;

  rescheduleValue = '';
  rescheduleSubmitting = false;
  rescheduleError: string | null = null;

  teamsHomeId: number | null = null;
  teamsAwayId: number | null = null;
  teamsSubmitting = false;
  teamsError: string | null = null;

  deleteConfirmMatchId: number | null = null;
  deleteSubmitting = false;
  deleteError: string | null = null;

  clearResultConfirmMatchId: number | null = null;
  clearResultSubmitting = false;
  clearResultError: string | null = null;

  resultMatch: DelegateMatch | null = null;
  resultLoading = false;
  resultError: string | null = null;
  resultSaving = false;
  resultSaveError: string | null = null;

  get selectedRound(): Round | null {
    return this.rounds.find((r) => r.roundNumber === this.selectedRoundNumber) ?? null;
  }

  ngOnInit(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      leagues: this.adminService.getLeagues(),
      teams: this.adminService.getAllTeams(),
    })
      .pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању лига.';
          return of({ leagues: [] as AdminLeague[], teams: [] as AdminTeam[] });
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ leagues, teams }) => {
        this.leagues = leagues ?? [];
        this.allTeams = teams ?? [];
        if (this.leagues.length > 0) {
          this.selectLeague(this.leagues[0].id);
        }
        this.cdr.detectChanges();
      });
  }

  leagueLabel(league: AdminLeague): string {
    const sport = SPORT_LABELS[league.sport] ?? league.sport;
    if (!league.gender) return sport;
    return `${sport} (${league.gender === 'Male' ? 'М' : 'Ж'})`;
  }

  teamsNotInLeague(): AdminTeam[] {
    const inLeagueIds = new Set(this.leagueTeams.map((t) => t.id));
    return this.allTeams.filter((t) => !inLeagueIds.has(t.id));
  }

  selectLeague(leagueId: number): void {
    this.selectedLeagueId = leagueId;
    this.closeMatchActions();
    this.addTeamId = null;
    this.addTeamError = null;
    this.addTeamSuccess = false;
    this.scheduleRoundNumber = null;
    this.scheduleHomeTeamId = null;
    this.scheduleAwayTeamId = null;
    this.scheduleAt = '';
    this.scheduleError = null;

    this.loadLeagueTeams(leagueId);
    this.loadMatches(leagueId);
  }

  private loadLeagueTeams(leagueId: number): void {
    this.leagueTeamsLoading = true;
    this.adminService
      .getTeamsInLeague(leagueId)
      .pipe(
        catchError(() => {
          this.addTeamError = 'Грешка при учитавању тимова лиге.';
          return of([] as AdminTeam[]);
        }),
        finalize(() => {
          this.leagueTeamsLoading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((teams) => {
        this.leagueTeams = teams ?? [];
        this.cdr.detectChanges();
      });
  }

  private loadMatches(leagueId: number): void {
    this.matchesLoading = true;
    this.matchesError = null;
    this.rounds = [];

    // GetSchedule vraca SVE mecove lige (odigrane i zakazane) - GetResults bi ovde
    // samo duplirao odigrane, zato admin ekran koristi iskljucivo raspored
    this.leagueService
      .getSchedule(leagueId)
      .pipe(
        catchError(() => {
          this.matchesError = 'Грешка при учитавању мечева.';
          return of([] as Match[]);
        }),
        finalize(() => {
          this.matchesLoading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((matches) => {
        this.rounds = this.groupByRound(matches ?? []);
        // Zadrzi izabrano kolo posle izmene meca - ne vracati korisnika na Kolo 1
        const stillExists = this.rounds.some((r) => r.roundNumber === this.selectedRoundNumber);
        if (!stillExists) {
          this.selectedRoundNumber = this.rounds[0]?.roundNumber ?? 0;
        }
        this.cdr.detectChanges();
      });
  }

  private groupByRound(matches: Match[]): Round[] {
    const map = new Map<number, Match[]>();
    for (const match of matches) {
      const existing = map.get(match.roundNumber) ?? [];
      existing.push(match);
      map.set(match.roundNumber, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, roundMatches]) => ({
        roundNumber,
        matches: roundMatches.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
      }));
  }

  selectRound(roundNumber: number): void {
    this.selectedRoundNumber = roundNumber;
    this.closeMatchActions();
  }

  isPlayoff(match: Match): boolean {
    return isPlayoffMatch(match);
  }

  // ── Dodavanje tima u ligu ────────────────────────────────
  submitAddTeam(): void {
    if (this.addTeamId === null || this.selectedLeagueId === null || this.addTeamSubmitting) return;

    this.addTeamSubmitting = true;
    this.addTeamError = null;
    this.addTeamSuccess = false;

    this.adminService
      .addTeamToLeague(this.selectedLeagueId, this.addTeamId)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.addTeamError = this.extractErrorMessage(err, 'Грешка при додавању тима у лигу.');
          return of('error' as const);
        }),
        finalize(() => {
          this.addTeamSubmitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.addTeamSuccess = true;
        this.addTeamId = null;
        this.loadLeagueTeams(this.selectedLeagueId!);
        this.cdr.detectChanges();
      });
  }

  // ── Zakazivanje meca ─────────────────────────────────────
  get canSchedule(): boolean {
    return (
      !!this.scheduleRoundNumber &&
      this.scheduleRoundNumber > 0 &&
      this.scheduleHomeTeamId !== null &&
      this.scheduleAwayTeamId !== null &&
      this.scheduleHomeTeamId !== this.scheduleAwayTeamId &&
      !!this.scheduleAt
    );
  }

  submitSchedule(): void {
    if (!this.canSchedule || this.selectedLeagueId === null || this.scheduleSubmitting) return;

    this.scheduleSubmitting = true;
    this.scheduleError = null;

    this.adminService
      .scheduleMatch(this.selectedLeagueId, {
        roundNumber: this.scheduleRoundNumber!,
        homeTeamId: this.scheduleHomeTeamId!,
        awayTeamId: this.scheduleAwayTeamId!,
        scheduledAt: new Date(this.scheduleAt).toISOString(),
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.scheduleError = this.extractErrorMessage(err, 'Грешка при заказивању меча.');
          return of('error' as const);
        }),
        finalize(() => {
          this.scheduleSubmitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.scheduleRoundNumber = null;
        this.scheduleHomeTeamId = null;
        this.scheduleAwayTeamId = null;
        this.scheduleAt = '';
        this.loadMatches(this.selectedLeagueId!);
      });
  }

  // ── Akcije nad mecem ─────────────────────────────────────
  private closeMatchActions(): void {
    this.expandedMatchId = null;
    this.expandedAction = null;
    this.deleteConfirmMatchId = null;
    this.clearResultConfirmMatchId = null;
    this.resultMatch = null;
    this.resultError = null;
    this.resultSaveError = null;
  }

  isExpanded(match: Match, action: MatchAction): boolean {
    return this.expandedMatchId === match.id && this.expandedAction === action;
  }

  toggleReschedule(match: Match): void {
    this.deleteConfirmMatchId = null;
    this.clearResultConfirmMatchId = null;
    if (this.isExpanded(match, 'reschedule')) {
      this.expandedMatchId = null;
      this.expandedAction = null;
      return;
    }
    this.expandedMatchId = match.id;
    this.expandedAction = 'reschedule';
    this.rescheduleError = null;
    this.rescheduleValue = this.toDatetimeLocal(match.scheduledAt);
  }

  saveReschedule(match: Match): void {
    if (!this.rescheduleValue || this.rescheduleSubmitting) return;

    this.rescheduleSubmitting = true;
    this.rescheduleError = null;

    this.adminService
      .updateMatch(match.id, { scheduledAt: new Date(this.rescheduleValue).toISOString() })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.rescheduleError = this.extractErrorMessage(err, 'Грешка при промени термина.');
          return of('error' as const);
        }),
        finalize(() => {
          this.rescheduleSubmitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.closeMatchActions();
        this.loadMatches(this.selectedLeagueId!);
      });
  }

  canChangeTeams(match: Match): boolean {
    return !match.result && !this.isPlayoff(match);
  }

  toggleTeamsEdit(match: Match): void {
    this.deleteConfirmMatchId = null;
    this.clearResultConfirmMatchId = null;
    if (this.isExpanded(match, 'teams')) {
      this.expandedMatchId = null;
      this.expandedAction = null;
      return;
    }
    this.expandedMatchId = match.id;
    this.expandedAction = 'teams';
    this.teamsError = null;
    this.teamsHomeId = match.homeTeamId;
    this.teamsAwayId = match.awayTeamId;
  }

  saveTeams(match: Match): void {
    if (this.teamsHomeId === null || this.teamsAwayId === null || this.teamsSubmitting) return;
    if (this.teamsHomeId === this.teamsAwayId) {
      this.teamsError = 'Домаћин и гост морају бити различити тимови.';
      return;
    }

    this.teamsSubmitting = true;
    this.teamsError = null;

    this.adminService
      .updateMatch(match.id, { homeTeamId: this.teamsHomeId, awayTeamId: this.teamsAwayId })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.teamsError = this.extractErrorMessage(err, 'Грешка при промени тимова.');
          return of('error' as const);
        }),
        finalize(() => {
          this.teamsSubmitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.closeMatchActions();
        this.loadMatches(this.selectedLeagueId!);
      });
  }

  askDeleteMatch(match: Match): void {
    this.closeMatchActions();
    this.deleteConfirmMatchId = match.id;
    this.deleteError = null;
  }

  cancelDeleteMatch(): void {
    this.deleteConfirmMatchId = null;
    this.deleteError = null;
  }

  confirmDeleteMatch(match: Match): void {
    if (this.deleteSubmitting) return;

    this.deleteSubmitting = true;
    this.deleteError = null;

    this.adminService
      .deleteMatch(match.id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.deleteError = this.extractErrorMessage(err, 'Грешка при брисању меча.');
          return of('error' as const);
        }),
        finalize(() => {
          this.deleteSubmitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.deleteConfirmMatchId = null;
        this.loadMatches(this.selectedLeagueId!);
      });
  }

  openResultForm(match: Match): void {
    this.deleteConfirmMatchId = null;
    this.clearResultConfirmMatchId = null;
    if (this.isExpanded(match, 'result')) {
      this.expandedMatchId = null;
      this.expandedAction = null;
      this.resultMatch = null;
      return;
    }

    this.expandedMatchId = match.id;
    this.expandedAction = 'result';
    this.resultLoading = true;
    this.resultError = null;
    this.resultSaveError = null;
    this.resultMatch = null;

    this.delegateService
      .getMatch(match.id)
      .pipe(
        catchError(() => {
          this.resultError = 'Грешка при учитавању меча.';
          return of(null);
        }),
        finalize(() => {
          this.resultLoading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((match) => {
        this.resultMatch = match;
        this.cdr.detectChanges();
      });
  }

  saveResult(request: SubmitMatchResult): void {
    if (this.expandedMatchId === null || this.resultSaving) return;

    this.resultSaving = true;
    this.resultSaveError = null;

    this.adminService
      .updateResult(this.expandedMatchId, request)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.resultSaveError = this.extractErrorMessage(err, 'Грешка при чувању резултата.');
          return of('error' as const);
        }),
        finalize(() => {
          this.resultSaving = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.closeMatchActions();
        this.loadMatches(this.selectedLeagueId!);
      });
  }

  askClearResult(match: Match): void {
    this.closeMatchActions();
    this.clearResultConfirmMatchId = match.id;
    this.clearResultError = null;
  }

  cancelClearResult(): void {
    this.clearResultConfirmMatchId = null;
    this.clearResultError = null;
  }

  confirmClearResult(match: Match): void {
    if (this.clearResultSubmitting) return;

    this.clearResultSubmitting = true;
    this.clearResultError = null;

    this.adminService
      .clearResult(match.id)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.clearResultError = this.extractErrorMessage(err, 'Грешка при поништавању резултата.');
          return of('error' as const);
        }),
        finalize(() => {
          this.clearResultSubmitting = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'error') return;
        this.clearResultConfirmMatchId = null;
        this.loadMatches(this.selectedLeagueId!);
      });
  }

  private toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Poruka sa servera je vec kratka engleska recenica (middleware je mapira sa exception-a) -
  // prikazujemo je direktno umesto sirovog HTTP odgovora, uz srpski fallback ako je nema
  private extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
    return err.error?.detail ?? fallback;
  }
}
