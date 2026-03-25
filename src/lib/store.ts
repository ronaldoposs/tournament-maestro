import { Tournament, Participant, Match } from "./types";

// Simple in-memory store with localStorage persistence
const STORAGE_KEY = "tournament-app";

interface AppState {
  tournaments: Tournament[];
  participants: Participant[];
  matches: Match[];
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tournaments: [], participants: [], matches: [] };
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
const listeners = new Set<() => void>();

function notify() {
  saveState(state);
  listeners.forEach((fn) => fn());
}

export const store = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Tournaments
  getTournaments: () => state.tournaments,
  getTournament: (id: string) => state.tournaments.find((t) => t.id === id),
  addTournament(t: Omit<Tournament, "id" | "participants" | "status">) {
    const tournament: Tournament = {
      ...t,
      id: crypto.randomUUID(),
      participants: [],
      status: "upcoming",
    };
    state = { ...state, tournaments: [...state.tournaments, tournament] };
    notify();
    return tournament;
  },
  updateTournament(id: string, data: Partial<Tournament>) {
    state = {
      ...state,
      tournaments: state.tournaments.map((t) =>
        t.id === id ? { ...t, ...data } : t
      ),
    };
    notify();
  },
  deleteTournament(id: string) {
    state = {
      ...state,
      tournaments: state.tournaments.filter((t) => t.id !== id),
      matches: state.matches.filter((m) => m.tournamentId !== id),
    };
    notify();
  },

  // Participants
  getParticipants: () => state.participants,
  getParticipant: (id: string) => state.participants.find((p) => p.id === id),
  addParticipant(p: Omit<Participant, "id" | "wins" | "losses" | "draws" | "points">) {
    const participant: Participant = {
      ...p,
      id: crypto.randomUUID(),
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
    };
    state = { ...state, participants: [...state.participants, participant] };
    notify();
    return participant;
  },
  updateParticipant(id: string, data: Partial<Participant>) {
    state = {
      ...state,
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...data } : p
      ),
    };
    notify();
  },
  deleteParticipant(id: string) {
    state = {
      ...state,
      participants: state.participants.filter((p) => p.id !== id),
      tournaments: state.tournaments.map((t) => ({
        ...t,
        participants: t.participants.filter((pid) => pid !== id),
      })),
    };
    notify();
  },

  // Tournament participants
  addParticipantToTournament(tournamentId: string, participantId: string) {
    state = {
      ...state,
      tournaments: state.tournaments.map((t) =>
        t.id === tournamentId && !t.participants.includes(participantId)
          ? { ...t, participants: [...t.participants, participantId] }
          : t
      ),
    };
    notify();
  },
  removeParticipantFromTournament(tournamentId: string, participantId: string) {
    state = {
      ...state,
      tournaments: state.tournaments.map((t) =>
        t.id === tournamentId
          ? { ...t, participants: t.participants.filter((p) => p !== participantId) }
          : t
      ),
    };
    notify();
  },

  // Matches / Bracket
  getMatches: (tournamentId: string) =>
    state.matches.filter((m) => m.tournamentId === tournamentId),

  generateBracket(tournamentId: string) {
    const tournament = state.tournaments.find((t) => t.id === tournamentId);
    if (!tournament || tournament.participants.length < 2) return;

    // Remove old matches
    const otherMatches = state.matches.filter((m) => m.tournamentId !== tournamentId);

    const pIds = [...tournament.participants];
    // Pad to next power of 2
    const size = Math.pow(2, Math.ceil(Math.log2(pIds.length)));
    while (pIds.length < size) pIds.push(""); // bye

    // Shuffle
    for (let i = pIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pIds[i], pIds[j]] = [pIds[j], pIds[i]];
    }

    const totalRounds = Math.log2(size);
    const matches: Match[] = [];

    // First round
    for (let i = 0; i < size / 2; i++) {
      const p1 = pIds[i * 2] || null;
      const p2 = pIds[i * 2 + 1] || null;
      const isBye = !p1 || !p2;
      matches.push({
        id: crypto.randomUUID(),
        tournamentId,
        round: 1,
        position: i,
        participant1Id: p1 || null,
        participant2Id: p2 || null,
        score1: isBye ? (p1 ? 1 : 0) : null,
        score2: isBye ? (p2 ? 1 : 0) : null,
        winnerId: isBye ? (p1 || p2) : null,
        status: isBye ? "completed" : "pending",
      });
    }

    // Later rounds (empty)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = size / Math.pow(2, round);
      for (let i = 0; i < matchesInRound; i++) {
        matches.push({
          id: crypto.randomUUID(),
          tournamentId,
          round,
          position: i,
          participant1Id: null,
          participant2Id: null,
          score1: null,
          score2: null,
          winnerId: null,
          status: "pending",
        });
      }
    }

    // Advance byes
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    round1.forEach((m, idx) => {
      if (m.winnerId && round2.length > 0) {
        const nextMatch = round2[Math.floor(idx / 2)];
        if (nextMatch) {
          if (idx % 2 === 0) nextMatch.participant1Id = m.winnerId;
          else nextMatch.participant2Id = m.winnerId;
        }
      }
    });

    state = {
      ...state,
      matches: [...otherMatches, ...matches],
      tournaments: state.tournaments.map((t) =>
        t.id === tournamentId ? { ...t, status: "active" as const } : t
      ),
    };
    notify();
  },

  recordResult(matchId: string, score1: number, score2: number) {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match || !match.participant1Id || !match.participant2Id) return;

    const winnerId = score1 > score2 ? match.participant1Id : score2 > score1 ? match.participant2Id : null;

    // Update match
    const updatedMatches = state.matches.map((m) =>
      m.id === matchId ? { ...m, score1, score2, winnerId, status: "completed" as const } : m
    );

    // Advance winner to next round
    if (winnerId) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const nextMatch = updatedMatches.find(
        (m) => m.tournamentId === match.tournamentId && m.round === nextRound && m.position === nextPosition
      );
      if (nextMatch) {
        if (match.position % 2 === 0) nextMatch.participant1Id = winnerId;
        else nextMatch.participant2Id = winnerId;
      }

      // Update participant stats
      const loserId = winnerId === match.participant1Id ? match.participant2Id : match.participant1Id;
      state = {
        ...state,
        participants: state.participants.map((p) => {
          if (p.id === winnerId) return { ...p, wins: p.wins + 1, points: p.points + 3 };
          if (p.id === loserId) return { ...p, losses: p.losses + 1 };
          return p;
        }),
      };
    }

    // Check if tournament is finished
    const tournamentMatches = updatedMatches.filter((m) => m.tournamentId === match.tournamentId);
    const allDone = tournamentMatches.every((m) => m.status === "completed");

    state = {
      ...state,
      matches: updatedMatches,
      tournaments: state.tournaments.map((t) =>
        t.id === match.tournamentId && allDone ? { ...t, status: "finished" as const } : t
      ),
    };
    notify();
  },
};
