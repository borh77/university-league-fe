import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminLeague, AdminTeam, ScheduleMatchRequest, UpdateMatchRequest } from '../models/admin.model';
import { SubmitMatchResult } from '../models/delegate-match.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly leaguesBaseUrl = '/api/admin/leagues';
  private readonly matchesBaseUrl = '/api/admin/matches';

  getLeagues(): Observable<AdminLeague[]> {
    return this.http.get<AdminLeague[]>(this.leaguesBaseUrl);
  }

  getTeamsInLeague(leagueId: number): Observable<AdminTeam[]> {
    return this.http.get<AdminTeam[]>(`${this.leaguesBaseUrl}/${leagueId}/teams`);
  }

  addTeamToLeague(leagueId: number, teamId: number): Observable<void> {
    return this.http.post<void>(`${this.leaguesBaseUrl}/${leagueId}/teams`, { teamId });
  }

  getAllTeams(): Observable<AdminTeam[]> {
    return this.http.get<AdminTeam[]>('/api/admin/teams');
  }

  scheduleMatch(leagueId: number, request: ScheduleMatchRequest): Observable<void> {
    return this.http.post<void>(`${this.leaguesBaseUrl}/${leagueId}/matches`, request);
  }

  updateMatch(matchId: number, request: UpdateMatchRequest): Observable<void> {
    return this.http.put<void>(`${this.matchesBaseUrl}/${matchId}`, request);
  }

  deleteMatch(matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.matchesBaseUrl}/${matchId}`);
  }

  updateResult(matchId: number, request: SubmitMatchResult): Observable<void> {
    return this.http.put<void>(`${this.matchesBaseUrl}/${matchId}/result`, request);
  }

  clearResult(matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.matchesBaseUrl}/${matchId}/result`);
  }
}
