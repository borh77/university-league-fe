export interface Player {
  id: number;
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
}

export interface Team {
  id: number;
  name: string;
  logoUrl: string | null;
  players: Player[];
}
