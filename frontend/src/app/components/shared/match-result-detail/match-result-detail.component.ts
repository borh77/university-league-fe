import { Component, Input } from '@angular/core';
import { Match } from '../../../models/match.model';

@Component({
  selector: 'app-match-result-detail',
  standalone: true,
  templateUrl: './match-result-detail.component.html',
  styleUrl: './match-result-detail.component.css',
})
export class MatchResultDetailComponent {
  @Input({ required: true }) match!: Match;

  parseTotalScore(result: string | null | undefined): [number, number] {
    const parts = result?.split(':') ?? [];
    return [parseInt(parts[0] ?? '0', 10), parseInt(parts[1] ?? '0', 10)];
  }

  getFirstHalfScore(match: Match): [number, number] {
    const firstHalf = (match.quarters ?? []).find((q) => q.quarterNumber === 1) ?? match.quarters?.[0] ?? null;
    return [firstHalf?.homeScore ?? 0, firstHalf?.awayScore ?? 0];
  }

  getSecondHalfScore(match: Match): [number, number] {
    const [totalHome, totalAway] = this.parseTotalScore(match.result);
    const [firstHalfHome, firstHalfAway] = this.getFirstHalfScore(match);
    return [totalHome - firstHalfHome, totalAway - firstHalfAway];
  }
}
