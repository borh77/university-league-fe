import { ChangeDetectorRef, Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { SportKey, SportSelectionService, VolleyballGender } from './services/sport-selection.service';

const FALLBACK_SPORT_LEAGUE_MAP: Record<string, number> = {
  football: -1,
  basketball: 2,
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
  private readonly sportSelection = inject(SportSelectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  selection = this.sportSelection;
  currentLeagueId = signal<number | null>(null);

  sports: { key: SportKey; label: string }[] = [
    { key: 'football', label: 'Fudbal' },
    { key: 'basketball', label: 'Košarka' },
    { key: 'volleyball', label: 'Odbojka' },
  ];

  isFootballSelected(): boolean {
    return this.sportSelection.snapshot.sport === 'football';
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Use fallback mapping so app does not depend on leagues endpoint.
    this.currentLeagueId.set(this.resolveLeagueId(this.sportSelection.snapshot.sport, this.sportSelection.snapshot.gender));

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
        } else if (url.includes('/top-scorers')) {
          if (sel.sport === 'football') {
            this.router.navigate(['/leagues', newLeagueId, 'top-scorers']);
          } else {
            this.router.navigate(['/leagues', newLeagueId, 'results']);
          }
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
    return FALLBACK_SPORT_LEAGUE_MAP[getLeagueKey(sport, gender)] ?? null;
  }
}
