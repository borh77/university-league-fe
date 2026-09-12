import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DelegateMatch,
  GoalEntry,
  Player,
  PlayerStatInput,
  QuarterScore,
  SetScore,
  SubmitMatchResult,
} from '../../models/delegate-match.model';
import { NumberStepperComponent } from '../shared/number-stepper/number-stepper.component';

interface GoalRow {
  isHomeTeamGoal: boolean;
  playerId: number | null;
  minute: number;
}

interface PlayerPointsRow {
  player: Player;
  points: number;
  played: boolean;
}

// Deljena forma za unos rezultata - koristi je admin ekran za izmenu rezultata.
// Isti obrazac steppera/validacije kao DelegateEntryComponent, ali kao samostalna
// komponenta koja moze da se predpopuni postojecim rezultatom (delegate ekran to ne radi).
@Component({
  selector: 'app-match-result-form',
  standalone: true,
  imports: [CommonModule, NumberStepperComponent],
  templateUrl: './match-result-form.component.html',
  styleUrl: './match-result-form.component.css',
})
export class MatchResultFormComponent implements OnChanges {
  @Input({ required: true }) match!: DelegateMatch;
  @Input() saving = false;
  @Input() saveError: string | null = null;
  @Input() submitLabel = 'Сачувај резултат';

  @Output() save = new EventEmitter<SubmitMatchResult>();

  quarters: QuarterScore[] = [];
  sets: SetScore[] = [];
  goalRows: GoalRow[] = [];
  homePlayerPoints: PlayerPointsRow[] = [];
  awayPlayerPoints: PlayerPointsRow[] = [];
  noGoalsConfirmed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['match']) {
      this.initializeForm(this.match);
    }
  }

  playerLabel(player: Player): string {
    return `${player.jerseyNumber} ${player.firstName} ${player.lastName}`;
  }

  private initializeForm(match: DelegateMatch): void {
    this.quarters = [];
    this.sets = [];
    this.goalRows = [];
    this.homePlayerPoints = [];
    this.awayPlayerPoints = [];
    this.noGoalsConfirmed = false;

    if (match.sport === 'Basketball') {
      this.quarters = match.quarters?.length
        ? match.quarters.map((q) => ({ ...q }))
        : [1, 2, 3, 4].map((n) => ({ quarterNumber: n, homeScore: 0, awayScore: 0 }));
      this.homePlayerPoints = this.buildPointsRows(match.homeRoster, match.playerStats, true);
      this.awayPlayerPoints = this.buildPointsRows(match.awayRoster, match.playerStats, false);
    } else if (match.sport === 'Volleyball') {
      this.sets = match.sets?.length
        ? match.sets.map((s) => ({ ...s }))
        : [1, 2, 3].map((n) => ({ setNumber: n, homeScore: 0, awayScore: 0 }));
      this.homePlayerPoints = this.buildPointsRows(match.homeRoster, match.playerStats, true);
      this.awayPlayerPoints = this.buildPointsRows(match.awayRoster, match.playerStats, false);
    } else if (match.sport === 'Football') {
      this.goalRows = (match.goals ?? []).map((goal) => ({
        isHomeTeamGoal: goal.isHomeTeamGoal,
        playerId: this.findPlayerIdByName(
          goal.isHomeTeamGoal ? match.homeRoster : match.awayRoster,
          goal.scorerName,
        ),
        minute: goal.minute,
      }));
      this.noGoalsConfirmed = match.hasResult && this.goalRows.length === 0;
    }
  }

  private buildPointsRows(
    roster: Player[],
    playerStats: DelegateMatch['playerStats'],
    isHomeTeam: boolean,
  ): PlayerPointsRow[] {
    return roster.map((player) => {
      const stat = playerStats?.find((s) => s.playerId === player.id && s.isHomeTeam === isHomeTeam);
      return { player, points: stat?.points ?? 0, played: stat !== undefined };
    });
  }

  private findPlayerIdByName(roster: Player[], scorerName: string): number | null {
    const found = roster.find((p) => `${p.firstName} ${p.lastName}` === scorerName);
    return found?.id ?? null;
  }

  setHomePoints(index: number, points: number): void {
    this.homePlayerPoints = this.withPoints(this.homePlayerPoints, index, points);
  }

  setAwayPoints(index: number, points: number): void {
    this.awayPlayerPoints = this.withPoints(this.awayPlayerPoints, index, points);
  }

  toggleHomePlayed(index: number, played: boolean): void {
    this.homePlayerPoints = this.withPlayed(this.homePlayerPoints, index, played);
  }

  toggleAwayPlayed(index: number, played: boolean): void {
    this.awayPlayerPoints = this.withPlayed(this.awayPlayerPoints, index, played);
  }

  private withPoints(rows: PlayerPointsRow[], index: number, points: number): PlayerPointsRow[] {
    const current = rows[index];
    const updated: PlayerPointsRow = {
      ...current,
      points,
      // Igrac koji je postigao poene je automatski "igrao" - ne traziti dodatni tap
      played: points > 0 ? true : current.played,
    };
    return rows.map((row, i) => (i === index ? updated : row));
  }

  private withPlayed(rows: PlayerPointsRow[], index: number, played: boolean): PlayerPointsRow[] {
    return rows.map((row, i) => (i === index ? { ...row, played } : row));
  }

  // ── Kosarka ──────────────────────────────────────────────
  get basketballHomeScore(): number {
    return this.quarters.reduce((sum, q) => sum + q.homeScore, 0);
  }

  get basketballAwayScore(): number {
    return this.quarters.reduce((sum, q) => sum + q.awayScore, 0);
  }

  get homePointsSum(): number {
    return this.homePlayerPoints.reduce((sum, row) => sum + row.points, 0);
  }

  get awayPointsSum(): number {
    return this.awayPlayerPoints.reduce((sum, row) => sum + row.points, 0);
  }

  addOvertimeQuarter(): void {
    this.quarters.push({ quarterNumber: this.quarters.length + 1, homeScore: 0, awayScore: 0 });
  }

  setQuarterHome(index: number, value: number): void {
    this.quarters[index] = { ...this.quarters[index], homeScore: value };
  }

  setQuarterAway(index: number, value: number): void {
    this.quarters[index] = { ...this.quarters[index], awayScore: value };
  }

  get basketballValid(): boolean {
    return (
      this.homePointsSum === this.basketballHomeScore &&
      this.awayPointsSum === this.basketballAwayScore &&
      (this.basketballHomeScore > 0 || this.basketballAwayScore > 0)
    );
  }

  // ── Odbojka ──────────────────────────────────────────────
  get volleyballHomeSets(): number {
    return this.sets.filter((s) => s.homeScore > s.awayScore).length;
  }

  get volleyballAwaySets(): number {
    return this.sets.filter((s) => s.awayScore > s.homeScore).length;
  }

  get volleyballHomePoints(): number {
    return this.sets.reduce((sum, s) => sum + s.homeScore, 0);
  }

  get volleyballAwayPoints(): number {
    return this.sets.reduce((sum, s) => sum + s.awayScore, 0);
  }

  get hasTiedSet(): boolean {
    return this.sets.some((s) => s.homeScore === s.awayScore && (s.homeScore > 0 || s.awayScore > 0));
  }

  // Odbojka se igra na tri dobijena seta
  get volleyballMatchComplete(): boolean {
    return this.volleyballHomeSets === 3 || this.volleyballAwaySets === 3;
  }

  addSet(): void {
    if (this.sets.length >= 5) return;
    this.sets.push({ setNumber: this.sets.length + 1, homeScore: 0, awayScore: 0 });
  }

  removeSet(): void {
    if (this.sets.length <= 1) return;
    this.sets = this.sets.slice(0, -1);
  }

  setSetHome(index: number, value: number): void {
    this.sets[index] = { ...this.sets[index], homeScore: value };
  }

  setSetAway(index: number, value: number): void {
    this.sets[index] = { ...this.sets[index], awayScore: value };
  }

  get volleyballValid(): boolean {
    return (
      !this.hasTiedSet &&
      this.volleyballMatchComplete &&
      this.homePointsSum === this.volleyballHomePoints &&
      this.awayPointsSum === this.volleyballAwayPoints
    );
  }

  // ── Fudbal ───────────────────────────────────────────────
  get footballHomeGoals(): number {
    return this.goalRows.filter((g) => g.isHomeTeamGoal).length;
  }

  get footballAwayGoals(): number {
    return this.goalRows.filter((g) => !g.isHomeTeamGoal).length;
  }

  addGoal(isHomeTeamGoal: boolean): void {
    const roster = isHomeTeamGoal ? this.match.homeRoster : this.match.awayRoster;
    this.goalRows = [
      ...this.goalRows,
      { isHomeTeamGoal, playerId: roster?.[0]?.id ?? null, minute: 1 },
    ];
  }

  removeGoal(index: number): void {
    this.goalRows = this.goalRows.filter((_, i) => i !== index);
  }

  setGoalMinute(index: number, value: number): void {
    this.goalRows[index] = { ...this.goalRows[index], minute: value };
  }

  setGoalPlayer(index: number, playerId: number): void {
    this.goalRows[index] = { ...this.goalRows[index], playerId };
  }

  get isGoallessDraw(): boolean {
    return this.footballHomeGoals === 0 && this.footballAwayGoals === 0;
  }

  get footballValid(): boolean {
    if (this.isGoallessDraw) return this.noGoalsConfirmed;
    return this.goalRows.every((g) => g.playerId !== null);
  }

  get canSubmit(): boolean {
    if (!this.match) return false;
    switch (this.match.sport) {
      case 'Basketball':
        return this.basketballValid;
      case 'Volleyball':
        return this.volleyballValid;
      default:
        return this.footballValid;
    }
  }

  submit(): void {
    if (!this.canSubmit || this.saving) return;
    this.save.emit(this.buildRequest(this.match));
  }

  private buildRequest(match: DelegateMatch): SubmitMatchResult {
    const playerStats: PlayerStatInput[] = [
      ...this.homePlayerPoints
        .filter((row) => row.played)
        .map((row) => ({ playerId: row.player.id, isHomeTeam: true, points: row.points })),
      ...this.awayPlayerPoints
        .filter((row) => row.played)
        .map((row) => ({ playerId: row.player.id, isHomeTeam: false, points: row.points })),
    ];

    if (match.sport === 'Basketball') {
      return {
        homeScore: this.basketballHomeScore,
        awayScore: this.basketballAwayScore,
        quarters: this.quarters,
        playerStats,
      };
    }

    if (match.sport === 'Volleyball') {
      return {
        homeScore: this.volleyballHomeSets,
        awayScore: this.volleyballAwaySets,
        sets: this.sets,
        playerStats,
      };
    }

    const goals: GoalEntry[] = this.goalRows.map((row) => {
      const roster = row.isHomeTeamGoal ? match.homeRoster : match.awayRoster;
      const player = roster.find((p) => p.id === row.playerId);
      return {
        scorerName: player ? `${player.firstName} ${player.lastName}` : '',
        teamName: row.isHomeTeamGoal ? match.homeTeamName : match.awayTeamName,
        isHomeTeamGoal: row.isHomeTeamGoal,
        minute: row.minute,
      };
    });

    return {
      homeScore: this.footballHomeGoals,
      awayScore: this.footballAwayGoals,
      goals: goals.length > 0 ? goals : undefined,
    };
  }
}
