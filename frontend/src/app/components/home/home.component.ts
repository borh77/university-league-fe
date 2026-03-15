import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap, catchError, of } from 'rxjs';
import { LeagueService } from '../../services/league.service';
import { SportSelectionService } from '../../services/sport-selection.service';
import { StandingsRow } from '../../models/standings-row.model';
import { RouterLink } from '@angular/router';

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
          this.cdr.detectChanges();

          return this.leagueService.getStandings(sel.sport, sel.gender).pipe(
            catchError(() => {
              this.error = 'Greška pri učitavanju tabele.';
              return of([] as StandingsRow[]);
            }),
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            }),
          );
        }),
      )
      .subscribe((rows) => {
        this.rows = rows ?? [];
        this.cdr.detectChanges();
      });
  }

  isVolleyball(): boolean {
    return this.sportSelection.snapshot.sport === 'volleyball';
  }
}
