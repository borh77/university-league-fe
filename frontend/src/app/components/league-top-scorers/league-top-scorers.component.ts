import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeagueService } from '../../services/league.service';
import { TopScorer } from '../../models/top-scorer.model';

@Component({
  selector: 'app-league-top-scorers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './league-top-scorers.component.html',
  styleUrl: './league-top-scorers.component.css',
})
export class LeagueTopScorersComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueService = inject(LeagueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  scorers: TopScorer[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.loadTopScorers(this.route.snapshot.paramMap);

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.loadTopScorers(params);
    });
  }

  private loadTopScorers(params: ParamMap): void {
    this.loading = true;
    this.error = null;
    this.scorers = [];

    const leagueId = Number(params.get('leagueId'));
    if (!Number.isFinite(leagueId)) {
      this.error = 'Neispravan ID lige.';
      this.loading = false;
      return;
    }

    this.leagueService
      .getTopScorers(leagueId)
      .pipe(
        catchError(() => {
          this.error = 'Greška pri učitavanju liste strelaca.';
          return of([] as TopScorer[]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((scorers) => {
        this.scorers = scorers ?? [];
        this.cdr.detectChanges();
      });
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2216%22 y=%2221%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23999%22%3E%3F%3C/text%3E%3C/svg%3E';
  }
}
