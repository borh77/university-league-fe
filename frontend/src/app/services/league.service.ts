import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';

@Injectable({
  providedIn: 'root',
})
export class LeagueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/public/leagues';

  getSchedule(leagueId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/${leagueId}/schedule`);
  }
}
