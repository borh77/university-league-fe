import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeagueService } from '../../services/league.service';
import { Match, PlayoffGroup, groupPlayoffMatches, splitRegularAndPlayoff } from '../../models/match.model';
import { MatchResultDetailComponent } from '../shared/match-result-detail/match-result-detail.component';

@Component({
  selector: 'app-league-playoff',
  standalone: true,
  imports: [CommonModule, RouterLink, MatchResultDetailComponent],
  templateUrl: './league-playoff.component.html',
  styleUrl: './league-playoff.component.css',
})
export class LeaguePlayoffComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueService = inject(LeagueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  playoffGroups: PlayoffGroup[] = [];
  loading = true;
  error: string | null = null;
  expandedMatchId: number | null = null;

  ngOnInit(): void {
    this.loadPlayoff(this.route.snapshot.paramMap);

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadPlayoff(params));
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2216%22 y=%2221%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23999%22%3E%3F%3C/text%3E%3C/svg%3E';
  }

  toggleMatch(matchId: number): void {
    this.expandedMatchId = this.expandedMatchId === matchId ? null : matchId;
  }

  hasDetail(match: Match): boolean {
    return !!(match.goals?.length || match.quarters?.length || match.sets?.length);
  }

  private loadPlayoff(params: ParamMap): void {
    this.loading = true;
    this.error = null;
    this.playoffGroups = [];
    this.expandedMatchId = null;

    const leagueId = Number(params.get('leagueId'));
    if (!Number.isFinite(leagueId)) {
      this.error = 'Неисправан ID лиге.';
      this.loading = false;
      return;
    }

    forkJoin({
      schedule: this.leagueService.getSchedule(leagueId).pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању плеј-офа.';
          return of([] as Match[]);
        }),
      ),
      results: this.leagueService.getResults(leagueId).pipe(
        catchError(() => {
          this.error = 'Грешка при учитавању плеј-офа.';
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
      .subscribe(({ schedule, results }) => {
        try {
          const scheduleSplit = splitRegularAndPlayoff(schedule ?? []);
          const resultsSplit = splitRegularAndPlayoff(results ?? []);
          const playoffMatches = this.mergeMatches(
            scheduleSplit.playoffMatches,
            resultsSplit.playoffMatches,
          );

          this.playoffGroups = groupPlayoffMatches(playoffMatches);
        } catch {
          this.playoffGroups = [];
          this.error = 'Грешка при обради плеј-офа.';
        }

        this.cdr.detectChanges();
      });
  }

  private mergeMatches(scheduleMatches: Match[], resultMatches: Match[]): Match[] {
    const matchMap = new Map<number, Match>();

    scheduleMatches.forEach((match) => {
      matchMap.set(match.id, match);
    });

    resultMatches.forEach((match) => {
      matchMap.set(match.id, match);
    });

    return Array.from(matchMap.values());
  }
}
