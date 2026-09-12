import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, CurrentUser, LoginRequest } from '../models/auth.model';

const STORAGE_KEY = 'unileague.auth.v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private token: string | null = null;

  currentUser = signal<CurrentUser | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  isDelegate = computed(() => this.currentUser()?.role === 'Delegate');

  constructor() {
    // localStorage ne postoji na serveru (SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSession();
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', request)
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    this.token = null;
    this.currentUser.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private restoreSession(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw) as AuthResponse;
      if (new Date(stored.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      this.token = stored.token;
      this.currentUser.set(this.toCurrentUser(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persistSession(response: AuthResponse): void {
    this.token = response.token;
    this.currentUser.set(this.toCurrentUser(response));

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    }
  }

  private toCurrentUser(response: AuthResponse): CurrentUser {
    return {
      username: response.username,
      fullName: response.fullName,
      role: response.role,
      expiresAt: response.expiresAt,
    };
  }
}
