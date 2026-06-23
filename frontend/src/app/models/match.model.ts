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
  stage?: string | null;
  isPlayoff?: boolean | null;
  playoffRoundLabel?: string | null;
  homeSeed?: number | null;
  awaySeed?: number | null;
  goals?: Goal[] | null;
  quarters?: QuarterScore[] | null;
  sets?: SetScore[] | null;
}

export function isPlayoffMatch(match: Match): boolean {
  return match.isPlayoff === true || match.stage?.startsWith('Playoff') === true;
}

export function splitRegularAndPlayoff(matches: Match[]): {
  regularSeasonMatches: Match[];
  playoffMatches: Match[];
} {
  return (matches ?? []).reduce(
    (acc, match) => {
      if (isPlayoffMatch(match)) {
        acc.playoffMatches.push(match);
      } else {
        acc.regularSeasonMatches.push(match);
      }

      return acc;
    },
    {
      regularSeasonMatches: [] as Match[],
      playoffMatches: [] as Match[],
    },
  );
}
