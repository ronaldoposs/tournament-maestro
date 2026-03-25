import { supabase } from "@/integrations/supabase/client";

// Helper functions wrapping Supabase queries for the tournament app

export async function fetchTournaments() {
  const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchTournament(id: string) {
  const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createTournament(t: { name: string; sport: string; date: string; mode?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("tournaments").insert({ ...t, created_by: user?.id }).select().single();
  if (error) throw error;
  return data;
}

// Teams
export async function fetchTeams(tournamentId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*, team_members(participant_id, participants(*))")
    .eq("tournament_id", tournamentId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function createTeam(tournamentId: string, name: string) {
  const { data, error } = await supabase.from("teams").insert({ tournament_id: tournamentId, name }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTeam(teamId: string) {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw error;
}

export async function addMemberToTeam(teamId: string, participantId: string) {
  const { error } = await supabase.from("team_members").insert({ team_id: teamId, participant_id: participantId });
  if (error) throw error;
}

export async function removeMemberFromTeam(teamId: string, participantId: string) {
  const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("participant_id", participantId);
  if (error) throw error;
}

export async function updateTournament(id: string, data: Record<string, unknown>) {
  const { error } = await supabase.from("tournaments").update(data).eq("id", id);
  if (error) throw error;
}

export async function deleteTournament(id: string) {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchParticipants() {
  const { data, error } = await supabase.from("participants").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function createParticipant(p: { name: string; team?: string }) {
  const { data, error } = await supabase.from("participants").insert(p).select().single();
  if (error) throw error;
  return data;
}

export async function updateParticipant(id: string, data: Record<string, unknown>) {
  const { error } = await supabase.from("participants").update(data).eq("id", id);
  if (error) throw error;
}

export async function deleteParticipant(id: string) {
  const { error } = await supabase.from("participants").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTournamentParticipants(tournamentId: string) {
  const { data, error } = await supabase
    .from("tournament_participants")
    .select("participant_id, participants(*)")
    .eq("tournament_id", tournamentId);
  if (error) throw error;
  return data;
}

export async function addParticipantToTournament(tournamentId: string, participantId: string) {
  const { error } = await supabase.from("tournament_participants").insert({ tournament_id: tournamentId, participant_id: participantId });
  if (error) throw error;
}

export async function removeParticipantFromTournament(tournamentId: string, participantId: string) {
  const { error } = await supabase.from("tournament_participants").delete().eq("tournament_id", tournamentId).eq("participant_id", participantId);
  if (error) throw error;
}

export async function fetchMatches(tournamentId: string) {
  const { data, error } = await supabase.from("matches").select("*").eq("tournament_id", tournamentId).order("round").order("position");
  if (error) throw error;
  return data;
}

export async function generateBracket(tournamentId: string) {
  // Get tournament participants
  const { data: tps } = await supabase.from("tournament_participants").select("participant_id").eq("tournament_id", tournamentId);
  if (!tps || tps.length < 2) return;

  // Delete old matches
  await supabase.from("matches").delete().eq("tournament_id", tournamentId);

  const pIds = tps.map((tp) => tp.participant_id);
  const size = Math.pow(2, Math.ceil(Math.log2(pIds.length)));

  // Pad with nulls for byes
  while (pIds.length < size) pIds.push(null as any);

  // Shuffle
  for (let i = pIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pIds[i], pIds[j]] = [pIds[j], pIds[i]];
  }

  const totalRounds = Math.log2(size);
  const matchInserts: any[] = [];

  // First round
  for (let i = 0; i < size / 2; i++) {
    const p1 = pIds[i * 2] || null;
    const p2 = pIds[i * 2 + 1] || null;
    const isBye = !p1 || !p2;
    matchInserts.push({
      tournament_id: tournamentId,
      round: 1,
      position: i,
      participant1_id: p1,
      participant2_id: p2,
      score1: isBye ? (p1 ? 1 : 0) : null,
      score2: isBye ? (p2 ? 1 : 0) : null,
      winner_id: isBye ? (p1 || p2) : null,
      status: isBye ? "completed" : "pending",
    });
  }

  // Later rounds (empty)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = size / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      matchInserts.push({
        tournament_id: tournamentId,
        round,
        position: i,
        participant1_id: null,
        participant2_id: null,
        status: "pending",
      });
    }
  }

  const { data: insertedMatches, error } = await supabase.from("matches").insert(matchInserts).select();
  if (error) throw error;

  // Advance byes to round 2
  const round1 = insertedMatches!.filter((m) => m.round === 1);
  const round2 = insertedMatches!.filter((m) => m.round === 2);

  for (let idx = 0; idx < round1.length; idx++) {
    const m = round1[idx];
    if (m.winner_id && round2.length > 0) {
      const nextMatch = round2[Math.floor(idx / 2)];
      if (nextMatch) {
        const field = idx % 2 === 0 ? "participant1_id" : "participant2_id";
        await supabase.from("matches").update({ [field]: m.winner_id }).eq("id", nextMatch.id);
      }
    }
  }

  // Set tournament to active
  await supabase.from("tournaments").update({ status: "active" }).eq("id", tournamentId);
}

export async function recordResult(matchId: string, score1: number, score2: number) {
  // Get the match
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (!match || !match.participant1_id || !match.participant2_id) return;

  const winnerId = score1 > score2 ? match.participant1_id : score2 > score1 ? match.participant2_id : null;
  const loserId = winnerId === match.participant1_id ? match.participant2_id : match.participant1_id;

  // Update match
  await supabase.from("matches").update({ score1, score2, winner_id: winnerId, status: "completed" }).eq("id", matchId);

  // Advance winner to next round
  if (winnerId) {
    const nextRound = match.round + 1;
    const nextPosition = Math.floor(match.position / 2);
    const { data: nextMatch } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", match.tournament_id)
      .eq("round", nextRound)
      .eq("position", nextPosition)
      .maybeSingle();

    if (nextMatch) {
      const field = match.position % 2 === 0 ? "participant1_id" : "participant2_id";
      await supabase.from("matches").update({ [field]: winnerId }).eq("id", nextMatch.id);
    }

    // Update participant stats
    const { data: winner } = await supabase.from("participants").select("wins, points").eq("id", winnerId).single();
    if (winner) {
      await supabase.from("participants").update({ wins: winner.wins + 1, points: winner.points + 3 }).eq("id", winnerId);
    }
    const { data: loser } = await supabase.from("participants").select("losses").eq("id", loserId!).single();
    if (loser) {
      await supabase.from("participants").update({ losses: loser.losses + 1 }).eq("id", loserId!);
    }
  }

  // Check if tournament is finished
  const { data: allMatches } = await supabase.from("matches").select("status").eq("tournament_id", match.tournament_id);
  if (allMatches?.every((m) => m.status === "completed")) {
    await supabase.from("tournaments").update({ status: "finished" }).eq("id", match.tournament_id);
  }
}
