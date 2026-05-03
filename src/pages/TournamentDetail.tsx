import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GitBranch, UserPlus, Users, X, Plus, Trash2, Search, Trophy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as api from "@/lib/supabase-store";
import { toast } from "sonner";

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOrganizer } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [tournamentParticipantIds, setTournamentParticipantIds] = useState<string[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamForMember, setSelectedTeamForMember] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    if (!id) return;
    const [t, allP, tps, m, tm] = await Promise.all([
      api.fetchTournament(id),
      api.fetchParticipants(),
      api.fetchTournamentParticipants(id),
      api.fetchMatches(id),
      api.fetchTeams(id),
    ]);
    setTournament(t);
    setAllParticipants(allP);
    setTournamentParticipantIds(tps.map((tp) => tp.participant_id));
    setMatches(m);
    setTeams(tm);
    setLoading(false);
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;

  if (!tournament) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Torneio não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/tournaments")}>Voltar</Button>
      </div>
    );
  }

  const isTeamMode = tournament.mode === "duplas" || tournament.mode === "equipes";
  const modeLabel = tournament.mode === "duplas" ? "Duplas" : tournament.mode === "equipes" ? "Equipes" : "Solo";
  const filteredAvailable = allParticipants
    .filter((p) => !tournamentParticipantIds.includes(p.id))
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const tournamentParticipants = allParticipants.filter((p) => tournamentParticipantIds.includes(p.id));

  // Get all participant IDs already assigned to teams
  const assignedToTeamIds = new Set(teams.flatMap((t: any) => t.team_members?.map((m: any) => m.participant_id) || []));
  const unassignedParticipants = tournamentParticipants.filter((p) => !assignedToTeamIds.has(p.id));

  const handleBulkAddParticipants = async () => {
    if (selectedToAdd.size === 0) return;
    try {
      for (const pid of selectedToAdd) {
        await api.addParticipantToTournament(tournament.id, pid);
      }
      toast.success(`${selectedToAdd.size} participante(s) adicionado(s)!`);
      setSelectedToAdd(new Set());
      setSearchQuery("");
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleParticipantSelection = (pid: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleRemoveParticipant = async (pid: string) => {
    try {
      await api.removeParticipantFromTournament(tournament.id, pid);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await api.createTeam(tournament.id, newTeamName.trim());
      setNewTeamName("");
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await api.deleteTeam(teamId);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAddMember = async () => {
    if (!selectedTeamForMember || !selectedMember) return;
    try {
      await api.addMemberToTeam(selectedTeamForMember, selectedMember);
      setSelectedMember("");
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveMember = async (teamId: string, participantId: string) => {
    try {
      await api.removeMemberFromTeam(teamId, participantId);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleGenerateBracket = async () => {
    try {
      await api.generateBracket(tournament.id, isTeamMode);
      loadAll();
      toast.success("Chaveamento gerado!");
    } catch (e: any) { toast.error(e.message); }
  };

  const getEntityName = (match: any) => {
    if (isTeamMode) {
      const t1 = match.team1_id ? teams.find((t: any) => t.id === match.team1_id)?.name : null;
      const t2 = match.team2_id ? teams.find((t: any) => t.id === match.team2_id)?.name : null;
      return { name1: t1 || (match.team1_id ? "—" : "BYE"), name2: t2 || (match.team2_id ? "—" : "BYE") };
    }
    const getName = (pid: string | null) => {
      if (!pid) return "BYE";
      return allParticipants.find((p) => p.id === pid)?.name || "—";
    };
    return { name1: getName(match.participant1_id), name2: getName(match.participant2_id) };
  };

  const canGenerateBracket = isTeamMode ? teams.length >= 2 : tournamentParticipants.length >= 2;

  const rounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const roundLabels = (r: number, total: number) => {
    if (r === total) return "Final";
    if (r === total - 1) return "Semifinal";
    if (r === total - 2) return "Quartas";
    return `Rodada ${r}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tournaments")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">{tournament.sport} • {tournament.date} • {modeLabel}</p>
        </div>
        <span className={`stat-badge ml-auto ${tournament.status === "active" ? "bg-accent/15 text-accent" : tournament.status === "finished" ? "bg-muted text-muted-foreground" : "bg-sport-orange/15 text-sport-orange"}`}>
          {tournament.status === "active" ? "Ativo" : tournament.status === "finished" ? "Finalizado" : "Próximo"}
        </span>
      </div>

      {/* Participants Section */}
      <div className="card-sport p-6">
        <h2 className="text-xl font-heading font-bold mb-4">Participantes ({tournamentParticipants.length})</h2>

        {isOrganizer && tournament.status === "upcoming" && (
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar participante pelo nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {(searchQuery || selectedToAdd.size > 0) && filteredAvailable.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto bg-card">
                {filteredAvailable.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selectedToAdd.has(p.id)}
                      onCheckedChange={() => toggleParticipantSelection(p.id)}
                    />
                    <span className="text-sm">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
            {searchQuery && filteredAvailable.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum participante encontrado.</p>
            )}
            {selectedToAdd.size > 0 && (
              <Button onClick={handleBulkAddParticipants} className="gap-1">
                <UserPlus className="w-4 h-4" /> Adicionar {selectedToAdd.size} participante(s)
              </Button>
            )}
          </div>
        )}

        {tournamentParticipants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum participante inscrito.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tournamentParticipants.map((p) => (
              <span key={p.id} className="stat-badge bg-secondary text-secondary-foreground">
                {p.name}
                {isOrganizer && tournament.status === "upcoming" && (
                  <button onClick={() => handleRemoveParticipant(p.id)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Teams Section - only for team modes */}
      {isTeamMode && (
        <div className="card-sport p-6">
          <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            {tournament.mode === "duplas" ? "Duplas" : "Equipes"} ({teams.length})
          </h2>

          {isOrganizer && tournament.status === "upcoming" && (
            <div className="space-y-4 mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder={`Nome da ${tournament.mode === "duplas" ? "dupla" : "equipe"}...`}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                />
                <Button onClick={handleCreateTeam} className="gap-1"><Plus className="w-4 h-4" /> Criar</Button>
              </div>

              {teams.length > 0 && unassignedParticipants.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedTeamForMember} onValueChange={setSelectedTeamForMember}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione a equipe..." /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o participante..." /></SelectTrigger>
                    <SelectContent>
                      {unassignedParticipants.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMember} className="gap-1"><UserPlus className="w-4 h-4" /> Adicionar</Button>
                </div>
              )}
            </div>
          )}

          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma {tournament.mode === "duplas" ? "dupla" : "equipe"} criada. Crie as {tournament.mode === "duplas" ? "duplas" : "equipes"} antes de gerar o chaveamento.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team: any) => (
                <div key={team.id} className="border rounded-lg p-4 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-semibold">{team.name}</h3>
                    {isOrganizer && tournament.status === "upcoming" && (
                      <button onClick={() => handleDeleteTeam(team.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {team.team_members?.map((m: any) => (
                      <span key={m.participant_id} className="stat-badge bg-primary/10 text-primary text-xs">
                        {m.participants?.name || "—"}
                        {isOrganizer && tournament.status === "upcoming" && (
                          <button onClick={() => handleRemoveMember(team.id, m.participant_id)} className="ml-1 hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {(!team.team_members || team.team_members.length === 0) && (
                      <span className="text-xs text-muted-foreground">Sem membros</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOrganizer && tournament.status === "upcoming" && canGenerateBracket && (
        <Button onClick={handleGenerateBracket} className="gap-2">
          <GitBranch className="w-4 h-4" /> Gerar Chaveamento
        </Button>
      )}

      {matches.length > 0 && (
        <div className="card-sport p-6">
          <h2 className="text-xl font-heading font-bold mb-6">Chaveamento</h2>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
              const roundMatches = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
              return (
                <div key={round} className="flex flex-col gap-4 min-w-[220px]">
                  <h3 className="text-sm font-semibold text-muted-foreground text-center">{roundLabels(round, rounds)}</h3>
                  <div className="flex flex-col gap-4 justify-around flex-1">
                    {roundMatches.map((m) => {
                      const names = getEntityName(m);
                      return (
                        <MatchCard
                          key={m.id}
                          match={m}
                          name1={names.name1}
                          name2={names.name2}
                          isOrganizer={isOrganizer}
                          isTeamMode={isTeamMode}
                          onResult={loadAll}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, name1, name2, isOrganizer, isTeamMode, onResult }: {
  match: any; name1: string; name2: string; isOrganizer: boolean; isTeamMode: boolean; onResult: () => void;
}) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");

  const hasP1 = isTeamMode ? match.team1_id : match.participant1_id;
  const hasP2 = isTeamMode ? match.team2_id : match.participant2_id;
  const winner1 = isTeamMode ? match.winner_team_id === match.team1_id : match.winner_id === match.participant1_id;
  const winner2 = isTeamMode ? match.winner_team_id === match.team2_id : match.winner_id === match.participant2_id;
  const canRecord = isOrganizer && match.status === "pending" && hasP1 && hasP2;

  const handleRecord = async () => {
    const score1 = parseInt(s1);
    const score2 = parseInt(s2);
    if (isNaN(score1) || isNaN(score2) || score1 === score2) return;
    try {
      await api.recordResult(match.id, score1, score2);
      onResult();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="border rounded-lg p-3 bg-card space-y-2">
      <div className={`flex items-center justify-between text-sm ${winner1 ? "font-bold" : ""}`}>
        <span className="truncate max-w-[120px]">{name1}</span>
        {match.status === "completed" ? (
          <span className="font-heading font-bold">{match.score1}</span>
        ) : canRecord ? (
          <input className="w-10 text-center border rounded text-sm py-0.5" value={s1} onChange={(e) => setS1(e.target.value)} />
        ) : null}
      </div>
      <div className="border-t" />
      <div className={`flex items-center justify-between text-sm ${winner2 ? "font-bold" : ""}`}>
        <span className="truncate max-w-[120px]">{name2}</span>
        {match.status === "completed" ? (
          <span className="font-heading font-bold">{match.score2}</span>
        ) : canRecord ? (
          <input className="w-10 text-center border rounded text-sm py-0.5" value={s2} onChange={(e) => setS2(e.target.value)} />
        ) : null}
      </div>
      {canRecord && (
        <Button size="sm" className="w-full text-xs mt-1" onClick={handleRecord}>Registrar</Button>
      )}
    </div>
  );
}
