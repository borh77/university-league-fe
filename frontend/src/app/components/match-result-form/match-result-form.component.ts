import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DelegateMatch,
  GoalEntry,
  QuarterScore,
  SetScore,
  SubmitMatchResult,
  Player,
} from '../../models/delegate-match.model';

interface GoalRow {
  isHomeTeamGoal: boolean;
  playerId: number | null;
  minute: number;
}

// Deljena forma za unos rezultata - koristi je admin ekran za izmenu rezultata.
// Ista validacija kao DelegateEntryComponent, ali kao samostalna komponenta koja
// moze da se predpopuni postojecim rezultatom (delegate ekran to ne radi).
@Component({
  selector: 'app-match-result-form',
  standalone: true,
  imports: [CommonModule],
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
  noGoalsConfirmed = false;
  legacyBasketballResult = false;

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
    this.noGoalsConfirmed = false;
    this.legacyBasketballResult = false;

    if (match.sport === 'Basketball') {
      // Kosarka ide na dva poluvremena (brojevi 1 i 2) - javni prikaz meca
      // racuna drugo poluvreme kao ukupno minus prvo, pa forma ne sme praviti cetvrtine
      const hasTwoHalves = match.quarters?.length === 2;
      this.legacyBasketballResult = match.hasResult && !hasTwoHalves;
      this.quarters = hasTwoHalves
        ? match.quarters!.map((q) => ({ ...q }))
        : [1, 2].map((n) => ({ quarterNumber: n, homeScore: 0, awayScore: 0 }));
    } else if (match.sport === 'Volleyball') {
      this.sets = match.sets?.length
        ? match.sets.map((s) => ({ ...s }))
        : [1, 2, 3].map((n) => ({ setNumber: n, homeScore: 0, awayScore: 0 }));
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

  private findPlayerIdByName(roster: Player[], scorerName: string): number | null {
    const found = roster.find((p) => `${p.firstName} ${p.lastName}` === scorerName);
    return found?.id ?? null;
  }

  // ── Kosarka ──────────────────────────────────────────────
  get basketballHomeScore(): number {
    return this.quarters.reduce((sum, q) => sum + q.homeScore, 0);
  }

  get basketballAwayScore(): number {
    return this.quarters.reduce((sum, q) => sum + q.awayScore, 0);
  }

  setQuarterHome(index: number, value: number): void {
    this.quarters[index] = { ...this.quarters[index], homeScore: Math.max(0, value || 0) };
  }

  setQuarterAway(index: number, value: number): void {
    this.quarters[index] = { ...this.quarters[index], awayScore: Math.max(0, value || 0) };
  }

  get basketballValid(): boolean {
    return this.basketballHomeScore > 0 || this.basketballAwayScore > 0;
  }

  // ── Odbojka ──────────────────────────────────────────────
  get volleyballHomeSets(): number {
    return this.sets.filter((s) => s.homeScore > s.awayScore).length;
  }

  get volleyballAwaySets(): number {
    return this.sets.filter((s) => s.awayScore > s.homeScore).length;
  }

  get hasTiedSet(): boolean {
    return this.sets.some((s) => s.homeScore === s.awayScore && (s.homeScore > 0 || s.awayScore > 0));
  }

  // Liga igra na dva dobijena seta
  get volleyballMatchComplete(): boolean {
    return this.volleyballHomeSets === 2 || this.volleyballAwaySets === 2;
  }

  addSet(): void {
    if (this.sets.length >= 3) return;
    this.sets.push({ setNumber: this.sets.length + 1, homeScore: 0, awayScore: 0 });
  }

  removeSet(): void {
    if (this.sets.length <= 1) return;
    this.sets = this.sets.slice(0, -1);
  }

  setSetHome(index: number, value: number): void {
    this.sets[index] = { ...this.sets[index], homeScore: Math.max(0, value || 0) };
  }

  setSetAway(index: number, value: number): void {
    this.sets[index] = { ...this.sets[index], awayScore: Math.max(0, value || 0) };
  }

  get volleyballValid(): boolean {
    return !this.hasTiedSet && this.volleyballMatchComplete;
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
    const lastTeamMinute = this.lastGoalMinuteForTeam(isHomeTeamGoal);
    this.goalRows = [
      ...this.goalRows,
      { isHomeTeamGoal, playerId: roster?.[0]?.id ?? null, minute: lastTeamMinute },
    ];
  }

  removeGoal(index: number): void {
    this.goalRows = this.goalRows.filter((_, i) => i !== index);
  }

  // Prethodni gol ISTOG tima pre datog reda - koristi se kao donja granica za minut
  // (dozvoljeno je >=, ne >, jer dva gola mogu pasti u istom minutu)
  previousTeamGoalMinute(index: number): number {
    const isHomeTeamGoal = this.goalRows[index].isHomeTeamGoal;
    for (let i = index - 1; i >= 0; i--) {
      if (this.goalRows[i].isHomeTeamGoal === isHomeTeamGoal) return this.goalRows[i].minute;
    }
    return 1;
  }

  private lastGoalMinuteForTeam(isHomeTeamGoal: boolean): number {
    for (let i = this.goalRows.length - 1; i >= 0; i--) {
      if (this.goalRows[i].isHomeTeamGoal === isHomeTeamGoal) return this.goalRows[i].minute;
    }
    return 1;
  }

  // Minut se sada kuca rucno, pa se pravilo proverava na unetoj vrednosti
  setGoalMinute(index: number, value: number): void {
    const minAllowed = this.previousTeamGoalMinute(index);
    const validMinute = Math.max(minAllowed, value || minAllowed);
    this.goalRows[index] = { ...this.goalRows[index], minute: validMinute };

    // Kasniji golovi istog tima ne smeju ostati ispod novog minuta
    const isHomeTeamGoal = this.goalRows[index].isHomeTeamGoal;
    let floor = validMinute;
    for (let i = index + 1; i < this.goalRows.length; i++) {
      if (this.goalRows[i].isHomeTeamGoal !== isHomeTeamGoal) continue;
      if (this.goalRows[i].minute < floor) {
        this.goalRows[i] = { ...this.goalRows[i], minute: floor };
      }
      floor = this.goalRows[i].minute;
    }
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
    if (match.sport === 'Basketball') {
      return {
        homeScore: this.basketballHomeScore,
        awayScore: this.basketballAwayScore,
        quarters: this.quarters,
      };
    }

    if (match.sport === 'Volleyball') {
      return {
        homeScore: this.volleyballHomeSets,
        awayScore: this.volleyballAwaySets,
        sets: this.sets,
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
