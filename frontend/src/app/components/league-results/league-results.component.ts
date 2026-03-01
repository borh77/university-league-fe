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
  loading = true;
  error: string | null = null;

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

    const leagueId = Number(params.get('leagueId'));
    if (!Number.isFinite(leagueId)) {
      this.error = 'Neispravan ID lige.';
      this.loading = false;
      return;
    }

    this.leagueService
      .getResults(leagueId)
      .pipe(
        catchError(() => {
          this.error = 'Greška pri učitavanju rezultata.';
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
        } catch {
          this.rounds = [];
          this.error = 'Greška pri obradi rezultata.';
        }
        this.cdr.detectChanges();
      });
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
}
