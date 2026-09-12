import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, of, tap } from 'rxjs';
import { LeagueService } from '../../services/league.service';
import { DelegateService } from '../../services/delegate.service';
import { Match } from '../../models/match.model';
import { DelegateMatch, SubmitMatchResult } from '../../models/delegate-match.model';
import { MatchResultFormComponent } from '../match-result-form/match-result-form.component';

@Component({
  selector: 'app-delegate-entry',
  standalone: true,
  imports: [CommonModule, MatchResultFormComponent],
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
        }
        this.cdr.detectChanges();
      });
  }

  backToList(): void {
    this.selectedMatchId = null;
    this.match = null;
  }

  submitResult(request: SubmitMatchResult): void {
    if (!this.match || this.submitting) return;

    const matchId = this.match.id;
    const currentParams = this.route.snapshot.paramMap;

    this.submitting = true;
    this.submitError = null;

    this.delegateService
      .submitResult(matchId, request)
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
}
