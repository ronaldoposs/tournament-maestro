export interface Tournament {
  id: string;
  name: string;
  sport: string;
  date: string;
  status: "upcoming" | "active" | "finished";
  participants: string[]; // participant IDs
}

export interface Participant {
  id: string;
  name: string;
  team?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  participant1Id: string | null;
  participant2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  status: "pending" | "completed";
}

export type SportModality =
  | "Futebol"
  | "Basquete"
  | "Vôlei"
  | "Beach Tennis"
  | "Tênis"
  | "Futsal"
  | "Handebol"
  | "Outro";
