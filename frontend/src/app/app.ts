import { ChangeDetectorRef, Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { SportKey, SportSelectionService, VolleyballGender } from './services/sport-selection.service';

const SPORT_LEAGUE_MAP: Record<string, number> = {
  football: -1,
  basketball: 2,
  handball: 3,
  'volleyball-male': -2,
  'volleyball-female': -3,
}; // VEOMA LOSE RESENJE ALI POSLUZICE ZA DEMO

function getLeagueKey(sport: SportKey, gender?: string): string {
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
    { key: 'football', label: 'Football' },
    { key: 'basketball', label: 'Basketball' },
    { key: 'handball', label: 'Handball' },
    { key: 'volleyball', label: 'Volleyball' },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Postavi inicijalni leagueId bez navigacije
    const initSel = this.sportSelection.snapshot;
    this.currentLeagueId.set(SPORT_LEAGUE_MAP[getLeagueKey(initSel.sport, initSel.gender)] ?? null);

    // Na svaku PROMENU sporta (skip(1) preskace inicijalni emit)
    this.sportSelection.selection$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((sel) => {
        const newLeagueId = SPORT_LEAGUE_MAP[getLeagueKey(sel.sport, sel.gender)] ?? null;
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
}
