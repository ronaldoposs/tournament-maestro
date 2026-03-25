import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GitBranch, UserPlus, X } from "lucide-react";
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
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    if (!id) return;
    const [t, allP, tps, m] = await Promise.all([
      api.fetchTournament(id),
      api.fetchParticipants(),
      api.fetchTournamentParticipants(id),
      api.fetchMatches(id),
    ]);
    setTournament(t);
    setAllParticipants(allP);
    setTournamentParticipantIds(tps.map((tp) => tp.participant_id));
    setMatches(m);
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

  const availableParticipants = allParticipants.filter((p) => !tournamentParticipantIds.includes(p.id));
  const tournamentParticipants = allParticipants.filter((p) => tournamentParticipantIds.includes(p.id));

  const handleAddParticipant = async () => {
    if (!selectedParticipant) return;
    try {
      await api.addParticipantToTournament(tournament.id, selectedParticipant);
      setSelectedParticipant("");
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveParticipant = async (pid: string) => {
    try {
      await api.removeParticipantFromTournament(tournament.id, pid);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleGenerateBracket = async () => {
    try {
      await api.generateBracket(tournament.id);
      loadAll();
      toast.success("Chaveamento gerado!");
    } catch (e: any) { toast.error(e.message); }
  };

  const getParticipantName = (pid: string | null) => {
    if (!pid) return "BYE";
    return allParticipants.find((p) => p.id === pid)?.name || "—";
  };

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
          <p className="text-muted-foreground">{tournament.sport} • {tournament.date}</p>
        </div>
        <span className={`stat-badge ml-auto ${tournament.status === "active" ? "bg-accent/15 text-accent" : tournament.status === "finished" ? "bg-muted text-muted-foreground" : "bg-sport-orange/15 text-sport-orange"}`}>
          {tournament.status === "active" ? "Ativo" : tournament.status === "finished" ? "Finalizado" : "Próximo"}
        </span>
      </div>

      <div className="card-sport p-6">
        <h2 className="text-xl font-heading font-bold mb-4">Participantes ({tournamentParticipants.length})</h2>

        {isOrganizer && tournament.status === "upcoming" && (
          <div className="flex gap-2 mb-4">
            <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar participante..." /></SelectTrigger>
              <SelectContent>
                {availableParticipants.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAddParticipant} className="gap-1"><UserPlus className="w-4 h-4" /> Adicionar</Button>
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

      {isOrganizer && tournament.status === "upcoming" && tournamentParticipants.length >= 2 && (
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
                    {roundMatches.map((m) => (
                      <MatchCard key={m.id} match={m} getName={getParticipantName} isOrganizer={isOrganizer} onResult={loadAll} />
                    ))}
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

function MatchCard({ match, getName, isOrganizer, onResult }: { match: any; getName: (id: string | null) => string; isOrganizer: boolean; onResult: () => void }) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");

  const canRecord = isOrganizer && match.status === "pending" && match.participant1_id && match.participant2_id;

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
      <div className={`flex items-center justify-between text-sm ${match.winner_id === match.participant1_id ? "font-bold" : ""}`}>
        <span className="truncate max-w-[120px]">{getName(match.participant1_id)}</span>
        {match.status === "completed" ? (
          <span className="font-heading font-bold">{match.score1}</span>
        ) : canRecord ? (
          <input className="w-10 text-center border rounded text-sm py-0.5" value={s1} onChange={(e) => setS1(e.target.value)} />
        ) : null}
      </div>
      <div className="border-t" />
      <div className={`flex items-center justify-between text-sm ${match.winner_id === match.participant2_id ? "font-bold" : ""}`}>
        <span className="truncate max-w-[120px]">{getName(match.participant2_id)}</span>
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
