export type SportKey = 'football' | 'basketball' | 'handball' | 'volleyball';
export type GenderKey = 'male' | 'female';

export interface LeagueListItem {
  id: number;
  name: string;
  sport: SportKey;
  gender?: GenderKey | null;
}
