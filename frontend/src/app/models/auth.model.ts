export type UserRole = 'Admin' | 'Delegate';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  fullName: string;
  role: UserRole;
  expiresAt: string;
}

export interface CurrentUser {
  username: string;
  fullName: string;
  role: UserRole;
  expiresAt: string;
}
