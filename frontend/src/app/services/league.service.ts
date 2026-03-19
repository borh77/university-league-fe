import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { Team } from '../models/team.model';
import { StandingsRow } from '../models/standings-row.model';
import { SportKey, VolleyballGender } from './sport-selection.service';
import { LeagueListItem } from '../models/league.model';
import { TopScorer } from '../models/top-scorer.model';

@Injectable({
  providedIn: 'root',
})
export class LeagueService {
  private readonly http = inject(HttpClient);

  private readonly leaguesBaseUrl = '/api/public/leagues';
  private readonly teamsBaseUrl = '/api/public/teams';

  getStandings(sport: SportKey, gender?: VolleyballGender): Observable<StandingsRow[]> {
    const query = sport === 'volleyball' ? `?gender=${encodeURIComponent(gender ?? 'male')}` : '';
    return this.http.get<StandingsRow[]>(`/api/public/${sport}/standings${query}`);
  }

  getSchedule(leagueId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.leaguesBaseUrl}/${leagueId}/schedule`);
  }

  getResults(leagueId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.leaguesBaseUrl}/${leagueId}/results`);
  }

  getTopScorers(leagueId: number): Observable<TopScorer[]> {
    return this.http.get<TopScorer[]>(`${this.leaguesBaseUrl}/${leagueId}/top-scorers`);
  }

  getTeam(teamId: number): Observable<Team> {
    return this.http.get<Team>(`${this.teamsBaseUrl}/${teamId}`);
  }

  getLeagues(): Observable<LeagueListItem[]> {
    return this.http.get<LeagueListItem[]>(this.leaguesBaseUrl);
  }
}
