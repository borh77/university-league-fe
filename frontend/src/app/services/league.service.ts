import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { Team } from '../models/team.model';

@Injectable({
  providedIn: 'root',
})
export class LeagueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/public/leagues';
  private readonly teamsBaseUrl = '/api/public/teams';

  getSchedule(leagueId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/${leagueId}/schedule`);
  }

  getResults(leagueId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/${leagueId}/results`);
  }

  getTeam(teamId: number): Observable<Team> {
    return this.http.get<Team>(`${this.teamsBaseUrl}/${teamId}`);
  }
}
