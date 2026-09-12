import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DelegateMatch, SubmitMatchResult } from '../models/delegate-match.model';

@Injectable({
  providedIn: 'root',
})
export class DelegateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/delegate/matches';

  getMatch(matchId: number): Observable<DelegateMatch> {
    return this.http.get<DelegateMatch>(`${this.baseUrl}/${matchId}`);
  }

  submitResult(matchId: number, request: SubmitMatchResult): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${matchId}/result`, request);
  }
}
