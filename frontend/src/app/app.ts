import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, skip, switchMap } from 'rxjs';
import {
  SportKey,
  SportSelectionService,
  VolleyballGender,
} from './services/sport-selection.service';
import { AuthService } from './services/auth.service';
import { LeagueLookupService } from './services/league-lookup.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly sportSelection = inject(SportSelectionService);
  private readonly leagueLookup = inject(LeagueLookupService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  selection = this.sportSelection;
  currentLeagueId = signal<number | null>(null);
  private shouldNavigateHomeOnNextSelectionChange = false;

  sports: { key: SportKey; label: string }[] = [
    { key: 'football', label: 'ФУДБАЛ' },
    { key: 'basketball', label: 'КОШАРКА' },
    { key: 'volleyball', label: 'ОДБОЈКА' },
  ];

  isFootballSelected(): boolean {
    return this.sportSelection.snapshot.sport === 'football';
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Ako URL vec sadrzi ID lige (npr. posle refresh-a), izvuci sport/gender iz
    // liste liga da app ne bi resetovao izbor sporta na default.
    const url = this.router.url;
    const leagueMatch = url.match(/\/leagues\/([^\/]+)/);
    if (leagueMatch) {
      const parsed = Number(leagueMatch[1]);
      this.currentLeagueId.set(parsed);

      this.leagueLookup
        .resolveSportAndGender(parsed)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((mapped) => {
          if (!mapped) return;
          this.sportSelection.setSport(mapped.sport);
          if (mapped.sport === 'volleyball' && mapped.gender) {
            this.sportSelection.setVolleyballGender(mapped.gender);
          }
        });
      // Ne vracamo se ovde - currentLeagueId je vec postavljen iznad.
    }

    this.leagueLookup
      .resolveLeagueId(this.sportSelection.snapshot.sport, this.sportSelection.snapshot.gender)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((leagueId) => {
        this.currentLeagueId.set(leagueId);
        this.cdr.detectChanges();
      });

    // Na svaku PROMENU sporta (skip(1) preskace inicijalni emit)
    this.sportSelection.selection$
      .pipe(
        skip(1),
        switchMap((sel) =>
          this.leagueLookup
            .resolveLeagueId(sel.sport, sel.gender)
            .pipe(map((leagueId) => ({ sel, leagueId }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ sel, leagueId: newLeagueId }) => {
        this.currentLeagueId.set(newLeagueId);
        this.cdr.detectChanges();

        if (newLeagueId === null) return;

        if (this.shouldNavigateHomeOnNextSelectionChange) {
          this.shouldNavigateHomeOnNextSelectionChange = false;
          this.router.navigate(['/']);
          return;
        }

        const url = this.router.url;
        if (url.includes('/results')) {
          this.router.navigate(['/leagues', newLeagueId, 'results']);
        } else if (url.includes('/admin')) {
          this.router.navigate(['/leagues', newLeagueId, 'admin']);
        } else if (url.includes('/delegate')) {
          this.router.navigate(['/leagues', newLeagueId, 'delegate']);
        } else if (url.includes('/schedule')) {
          this.router.navigate(['/leagues', newLeagueId, 'schedule']);
        } else if (url.includes('/top-scorers')) {
          if (sel.sport === 'football') {
            this.router.navigate(['/leagues', newLeagueId, 'top-scorers']);
          } else {
            this.router.navigate(['/leagues', newLeagueId, 'results']);
          }
        } else if (url.includes('/playoff')) {
          this.router.navigate(['/leagues', newLeagueId, 'playoff']);
        }
        // na standings (/) ne treba navigacija - HomeComponent vec slusa selection$
      });
  }

  setSport(sport: SportKey): void {
    const previousSport = this.sportSelection.snapshot.sport;
    this.shouldNavigateHomeOnNextSelectionChange = true;
    this.sportSelection.setSport(sport);

    // Clicking an already selected sport may not emit a selection change.
    if (this.sportSelection.snapshot.sport === previousSport) {
      this.shouldNavigateHomeOnNextSelectionChange = false;
      this.router.navigate(['/']);
    }
  }

  setVolleyballGender(gender: VolleyballGender): void {
    this.sportSelection.setVolleyballGender(gender);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  onBrandLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%233a86ff%22/%3E%3Ctext x=%2216%22 y=%2221%22 text-anchor=%22middle%22 font-size=%2214%22 font-weight=%22bold%22 fill=%22%23fff%22%3EU%3C/text%3E%3C/svg%3E';
  }
}
