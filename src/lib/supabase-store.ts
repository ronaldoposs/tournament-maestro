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

export async function generateBracket(tournamentId: string, isTeamMode = false) {
  // Delete old matches
  await supabase.from("matches").delete().eq("tournament_id", tournamentId);

  let entityIds: (string | null)[];

  if (isTeamMode) {
    const { data: teamRows } = await supabase.from("teams").select("id").eq("tournament_id", tournamentId);
    if (!teamRows || teamRows.length < 2) return;
    entityIds = teamRows.map((t) => t.id);
  } else {
    const { data: tps } = await supabase.from("tournament_participants").select("participant_id").eq("tournament_id", tournamentId);
    if (!tps || tps.length < 2) return;
    entityIds = tps.map((tp) => tp.participant_id);
  }

  const size = Math.pow(2, Math.ceil(Math.log2(entityIds.length)));
  while (entityIds.length < size) entityIds.push(null);

  // Shuffle
  for (let i = entityIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entityIds[i], entityIds[j]] = [entityIds[j], entityIds[i]];
  }

  const totalRounds = Math.log2(size);
  const matchInserts: any[] = [];
  const p1Field = isTeamMode ? "team1_id" : "participant1_id";
  const p2Field = isTeamMode ? "team2_id" : "participant2_id";
  const winnerField = isTeamMode ? "winner_team_id" : "winner_id";

  // First round
  for (let i = 0; i < size / 2; i++) {
    const e1 = entityIds[i * 2] || null;
    const e2 = entityIds[i * 2 + 1] || null;
    const isBye = !e1 || !e2;
    matchInserts.push({
      tournament_id: tournamentId,
      round: 1,
      position: i,
      [p1Field]: e1,
      [p2Field]: e2,
      score1: isBye ? (e1 ? 1 : 0) : null,
      score2: isBye ? (e2 ? 1 : 0) : null,
      [winnerField]: isBye ? (e1 || e2) : null,
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
    const winnerId = isTeamMode ? m.winner_team_id : m.winner_id;
    if (winnerId && round2.length > 0) {
      const nextMatch = round2[Math.floor(idx / 2)];
      if (nextMatch) {
        const field = idx % 2 === 0 ? p1Field : p2Field;
        await supabase.from("matches").update({ [field]: winnerId }).eq("id", nextMatch.id);
      }
    }
  }

  // Set tournament to active
  await supabase.from("tournaments").update({ status: "active" }).eq("id", tournamentId);
}

export async function recordResult(matchId: string, score1: number, score2: number) {
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
  if (!match) return;

  // Determine if team mode based on which fields are populated
  const isTeamMode = !!(match.team1_id || match.team2_id);

  if (isTeamMode) {
    if (!match.team1_id || !match.team2_id) return;
    const winnerTeamId = score1 > score2 ? match.team1_id : score2 > score1 ? match.team2_id : null;

    const loserTeamId = winnerTeamId === match.team1_id ? match.team2_id : match.team1_id;

    await supabase.from("matches").update({ score1, score2, winner_team_id: winnerTeamId, status: "completed" }).eq("id", matchId);

    if (winnerTeamId) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const { data: nextMatch } = await supabase
        .from("matches").select("id")
        .eq("tournament_id", match.tournament_id).eq("round", nextRound).eq("position", nextPosition)
        .maybeSingle();
      if (nextMatch) {
        const field = match.position % 2 === 0 ? "team1_id" : "team2_id";
        await supabase.from("matches").update({ [field]: winnerTeamId }).eq("id", nextMatch.id);
      }

      // Update individual participant stats for winning team members
      const { data: winnerMembers } = await supabase.from("team_members").select("participant_id").eq("team_id", winnerTeamId);
      if (winnerMembers) {
        for (const m of winnerMembers) {
          const { data: p } = await supabase.from("participants").select("wins, points").eq("id", m.participant_id).single();
          if (p) {
            await supabase.from("participants").update({ wins: p.wins + 1, points: p.points + 3 }).eq("id", m.participant_id);
          }
        }
      }
      // Update individual participant stats for losing team members
      if (loserTeamId) {
        const { data: loserMembers } = await supabase.from("team_members").select("participant_id").eq("team_id", loserTeamId);
        if (loserMembers) {
          for (const m of loserMembers) {
            const { data: p } = await supabase.from("participants").select("losses").eq("id", m.participant_id).single();
            if (p) {
              await supabase.from("participants").update({ losses: p.losses + 1 }).eq("id", m.participant_id);
            }
          }
        }
      }
    }
  } else {
    if (!match.participant1_id || !match.participant2_id) return;
    const winnerId = score1 > score2 ? match.participant1_id : score2 > score1 ? match.participant2_id : null;
    const loserId = winnerId === match.participant1_id ? match.participant2_id : match.participant1_id;

    await supabase.from("matches").update({ score1, score2, winner_id: winnerId, status: "completed" }).eq("id", matchId);

    if (winnerId) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const { data: nextMatch } = await supabase
        .from("matches").select("id")
        .eq("tournament_id", match.tournament_id).eq("round", nextRound).eq("position", nextPosition)
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
  }

  // Check if tournament is finished
  const { data: allMatches } = await supabase.from("matches").select("status").eq("tournament_id", match.tournament_id);
  if (allMatches?.every((m) => m.status === "completed")) {
    await supabase.from("tournaments").update({ status: "finished" }).eq("id", match.tournament_id);
  }
}
