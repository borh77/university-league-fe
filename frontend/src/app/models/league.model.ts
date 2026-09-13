export type SportKey = 'football' | 'basketball' | 'volleyball';
export type GenderKey = 'male' | 'female';

export interface LeagueListItem {
  id: number;
  sport: SportKey;
  gender?: GenderKey | null;
}
