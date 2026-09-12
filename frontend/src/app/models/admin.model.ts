export interface AdminLeague {
  id: number;
  sport: string;
  gender?: string | null;
}

export interface AdminTeam {
  id: number;
  name: string;
  logoUrl?: string | null;
}

export interface ScheduleMatchRequest {
  roundNumber: number;
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
}

export interface UpdateMatchRequest {
  scheduledAt?: string;
  homeTeamId?: number;
  awayTeamId?: number;
}
