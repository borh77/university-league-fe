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

export interface Goal {
  scorerName: string;
  teamName: string;
  isHomeTeamGoal: boolean;
  minute: number;
}

export interface Match {
  id: number;
  leagueId: number;
  roundNumber: number;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamLogoUrl: string;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamLogoUrl: string;
  scheduledAt: string; // ISO 8601 datetime string
  result?: string | null; // e.g. "2:1", present only on played matches
  goals?: Goal[] | null;
  quarters?: QuarterScore[] | null;
  sets?: SetScore[] | null;
}
