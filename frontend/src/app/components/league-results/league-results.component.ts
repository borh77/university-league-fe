import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
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

  rounds: Round[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    const leagueId = Number(this.route.snapshot.paramMap.get('leagueId'));
    this.leagueService.getResults(leagueId).subscribe({
      next: (matches) => {
        this.rounds = this.groupByRound(matches);
        this.loading = false;
      },
      error: () => {
        this.error = 'Greška pri učitavanju rezultata.';
        this.loading = false;
      },
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
    for (const match of matches) {
      const existing = map.get(match.roundNumber) ?? [];
      existing.push(match);
      map.set(match.roundNumber, existing);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([roundNumber, matches]) => ({ roundNumber, matches }));
  }
}
