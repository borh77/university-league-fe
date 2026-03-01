import { ChangeDetectorRef, Component, OnInit, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeagueService } from '../../services/league.service';
import { Team } from '../../models/team.model';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.css',
})
export class TeamDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leagueService = inject(LeagueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  team: Team | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.loadTeam(this.route.snapshot.paramMap);

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((params) => this.loadTeam(params));
  }

  private loadTeam(params: ParamMap): void {
    this.loading = true;
    this.error = null;
    this.team = null;

    const teamId = Number(params.get('teamId'));
    if (!Number.isFinite(teamId)) {
      this.error = 'Neispravan ID tima.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.leagueService
      .getTeam(teamId)
      .pipe(
        catchError((err) => {
          this.error =
            err.status === 404 ? 'Tim nije pronađen.' : 'Greška pri učitavanju tima.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((team) => {
        if (!team) {
          this.team = null;
          return;
        }

        this.team = {
          ...team,
          players: Array.isArray(team.players) ? team.players : [],
        };
        this.cdr.detectChanges();
      });
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2232%22 fill=%22%23e0e0e0%22/%3E%3Ctext x=%2232%22 y=%2242%22 text-anchor=%22middle%22 font-size=%2228%22 fill=%22%23999%22%3E%3F%3C/text%3E%3C/svg%3E';
  }

  onPlayerImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Ccircle cx=%2224%22 cy=%2224%22 r=%2224%22 fill=%22%23e0e0e0%22/%3E%3Ccircle cx=%2224%22 cy=%2219%22 r=%228%22 fill=%22%23bbb%22/%3E%3Cellipse cx=%2224%22 cy=%2240%22 rx=%2213%22 ry=%228%22 fill=%22%23bbb%22/%3E%3C/svg%3E';
  }
}
