export interface Player {
  id: number;
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
}

export interface QuarterScore {
  quarterNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface SetScore {
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface GoalEntry {
  scorerName: string;
  teamName: string;
  isHomeTeamGoal: boolean;
  minute: number;
}

export interface PlayerStatLine {
  playerId: number;
  playerName: string;
  jerseyNumber: number;
  isHomeTeam: boolean;
  points: number;
}

export interface DelegateMatch {
  id: number;
  leagueId: number;
  sport: 'Football' | 'Basketball' | 'Volleyball';
  roundNumber: number;
  scheduledAt: string;
  stage: string;
  isPlayoff: boolean;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  hasResult: boolean;
  result?: string | null;
  homeRoster: Player[];
  awayRoster: Player[];
  quarters?: QuarterScore[] | null;
  sets?: SetScore[] | null;
  goals?: GoalEntry[] | null;
  playerStats?: PlayerStatLine[] | null;
}

export interface PlayerStatInput {
  playerId: number;
  isHomeTeam: boolean;
  points: number;
}

export interface SubmitMatchResult {
  homeScore: number;
  awayScore: number;
  quarters?: QuarterScore[];
  sets?: SetScore[];
  goals?: GoalEntry[];
  playerStats?: PlayerStatInput[];
}
