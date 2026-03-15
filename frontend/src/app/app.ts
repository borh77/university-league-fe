import { ChangeDetectorRef, Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, skip } from 'rxjs';
import { LeagueListItem } from './models/league.model';
import { LeagueService } from './services/league.service';
import { SportKey, SportSelectionService, VolleyballGender } from './services/sport-selection.service';

const FALLBACK_SPORT_LEAGUE_MAP: Record<string, number> = {
  football: -1,
  basketball: 2,
  handball: 3,
  'volleyball-male': -2,
  'volleyball-female': -3,
};

function getLeagueKey(sport: SportKey, gender?: VolleyballGender): string {
  return sport === 'volleyball' ? `volleyball-${gender ?? 'male'}` : sport;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly leagueService = inject(LeagueService);
  private readonly sportSelection = inject(SportSelectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private leagues: LeagueListItem[] = [];

  selection = this.sportSelection;
  currentLeagueId = signal<number | null>(null);

  sports: { key: SportKey; label: string }[] = [
    { key: 'football', label: 'Fudbal' },
    { key: 'basketball', label: 'Košarka' },
    { key: 'handball', label: 'Rukomet' },
    { key: 'volleyball', label: 'Odbojka' },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Keep nav links clickable even if league list endpoint is unavailable.
    this.currentLeagueId.set(this.resolveLeagueId(this.sportSelection.snapshot.sport, this.sportSelection.snapshot.gender));

    this.leagueService
      .getLeagues()
      .pipe(
        catchError(() => of([] as LeagueListItem[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((leagues) => {
        this.leagues = leagues ?? [];
        this.currentLeagueId.set(this.resolveLeagueId(this.sportSelection.snapshot.sport, this.sportSelection.snapshot.gender));
        this.cdr.detectChanges();
      });

    // Na svaku PROMENU sporta (skip(1) preskace inicijalni emit)
    this.sportSelection.selection$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((sel) => {
        const newLeagueId = this.resolveLeagueId(sel.sport, sel.gender);
        this.currentLeagueId.set(newLeagueId);
        this.cdr.detectChanges();

        if (newLeagueId === null) return;

        const url = this.router.url;
        if (url.includes('/results')) {
          this.router.navigate(['/leagues', newLeagueId, 'results']);
        } else if (url.includes('/schedule')) {
          this.router.navigate(['/leagues', newLeagueId, 'schedule']);
        }
        // na standings (/) ne treba navigacija - HomeComponent vec slusa selection$
      });
  }

  setSport(sport: SportKey): void {
    this.sportSelection.setSport(sport);
  }

  setVolleyballGender(gender: VolleyballGender): void {
    this.sportSelection.setVolleyballGender(gender);
  }

  onBrandLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%233a86ff%22/%3E%3Ctext x=%2216%22 y=%2221%22 text-anchor=%22middle%22 font-size=%2214%22 font-weight=%22bold%22 fill=%22%23fff%22%3EU%3C/text%3E%3C/svg%3E';
  }

  private resolveLeagueId(sport: SportKey, gender?: VolleyballGender): number | null {
    const sportLeagues = this.leagues.filter((league) => league.sport === sport);
    if (sportLeagues.length === 0) {
      return FALLBACK_SPORT_LEAGUE_MAP[getLeagueKey(sport, gender)] ?? null;
    }

    if (sport !== 'volleyball') {
      return sportLeagues[0].id;
    }

    const wantedGender = gender ?? 'male';
    const genderMatch = sportLeagues.find((league) => league.gender === wantedGender);
    return (genderMatch ?? sportLeagues[0]).id;
  }
}
