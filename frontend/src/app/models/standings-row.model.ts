export interface StandingsRow {
  position: number;
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  scored: number;
  conceded: number;
  difference: number;

  // Volleyball-specific
  setWon?: number | null;
  setLost?: number | null;
  setDifference?: number | null;
}
