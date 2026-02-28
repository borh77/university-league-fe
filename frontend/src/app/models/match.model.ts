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
}
