import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as api from "@/lib/supabase-store";
import { Trophy, Medal, Share2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareCard from "@/components/ShareCard";
import { useTheme } from "@/hooks/useTheme";

export default function PublicTournament() {
  const { id } = useParams<{ id: string }>();
  const { theme, toggle } = useTheme();
  const [tournament, setTournament] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [allParticipants, setAllParticipants] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [shareIdx, setShareIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    if (!id) return;
    const [t, r, m, parts, tm] = await Promise.all([
      api.fetchTournament(id).catch(() => null),
      api.fetchTournamentRanking(id),
      api.fetchMatches(id),
      api.fetchParticipants(),
      api.fetchTeams(id),
    ]);
    setTournament(t);
    setRanking(r);
    setMatches(m);
    setAllParticipants(parts);
    setTeams(tm);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    if (!id) return;
    const ch = supabase
      .channel(`public-tournament-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${id}` }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Torneio não encontrado.</p>
      </div>
    );
  }

  const isTeamMode = tournament.mode === "duplas" || tournament.mode === "equipes";
  const rounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const roundLabels = (r: number, total: number) => {
    if (r === total) return "Final";
    if (r === total - 1) return "Semifinal";
    if (r === total - 2) return "Quartas";
    return `Rodada ${r}`;
  };

  const getEntityName = (match: any) => {
    if (isTeamMode) {
      const t1 = match.team1_id ? teams.find((t: any) => t.id === match.team1_id)?.name : null;
      const t2 = match.team2_id ? teams.find((t: any) => t.id === match.team2_id)?.name : null;
      return { name1: t1 || (match.team1_id ? "—" : "BYE"), name2: t2 || (match.team2_id ? "—" : "BYE") };
    }
    const getName = (pid: string | null) => (pid ? allParticipants.find((p) => p.id === pid)?.name || "—" : "BYE");
    return { name1: getName(match.participant1_id), name2: getName(match.participant2_id) };
  };

  const selected = shareIdx !== null ? ranking[shareIdx] : null;

  const handleShareTournament = async () => {
    const url = window.location.href;
    try {
      const nav = navigator as any;
      if (nav.share) await nav.share({ title: tournament.name, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("Link copiado!");
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="sport-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-heading font-bold">
            <Trophy className="w-5 h-5" />
            TorneiosPro
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="text-white hover:bg-white/10">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="secondary" size="sm" className="gap-2" onClick={handleShareTournament}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-8 pb-12 pt-6 flex items-center gap-6 flex-wrap">
          {tournament.logo_url ? (
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white/30"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/15 flex items-center justify-center">
              <Trophy className="w-12 h-12" />
            </div>
          )}
          <div>
            <p className="uppercase text-xs tracking-widest text-white/70">Página pública</p>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mt-1">{tournament.name}</h1>
            <p className="text-white/80 mt-2">
              {tournament.sport} · {tournament.date} ·{" "}
              {tournament.mode === "duplas" ? "Duplas" : tournament.mode === "equipes" ? "Equipes" : "Individual"} ·{" "}
              {tournament.status === "active" ? "Em andamento" : tournament.status === "finished" ? "Finalizado" : "Em breve"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Ranking */}
        <section className="card-sport p-6">
          <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-accent" /> Classificação do torneio
          </h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem resultados registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-sm">
                    <th className="text-center p-3 w-14">#</th>
                    <th className="text-left p-3">Participante</th>
                    <th className="text-center p-3">V</th>
                    <th className="text-center p-3">D</th>
                    <th className="text-center p-3">Pts</th>
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((p, i) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-center">
                        <span
                          className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-sm font-bold ${
                            i === 0
                              ? "bg-sport-gold text-foreground"
                              : i === 1
                              ? "bg-secondary text-secondary-foreground"
                              : i === 2
                              ? "bg-sport-orange/20 text-sport-orange"
                              : "text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          className="flex items-center gap-3 font-medium hover:text-accent transition-colors"
                          onClick={() => setShareIdx(i)}
                        >
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="hover:underline">{p.name}</span>
                        </button>
                      </td>
                      <td className="p-3 text-center text-accent font-bold">{p.wins}</td>
                      <td className="p-3 text-center text-destructive font-bold">{p.losses}</td>
                      <td className="p-3 text-center font-heading font-bold">{p.points}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => setShareIdx(i)} className="text-muted-foreground hover:text-accent">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Bracket */}
        {matches.length > 0 && (
          <section className="card-sport p-6">
            <h2 className="text-xl font-heading font-bold mb-4">Chaveamento</h2>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
                const roundMatches = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
                return (
                  <div key={round} className="flex flex-col gap-4 min-w-[200px]">
                    <h3 className="text-sm font-semibold text-muted-foreground text-center">{roundLabels(round, rounds)}</h3>
                    <div className="flex flex-col gap-3 justify-around flex-1">
                      {roundMatches.map((m) => {
                        const names = getEntityName(m);
                        const w1 = isTeamMode ? m.winner_team_id === m.team1_id : m.winner_id === m.participant1_id;
                        const w2 = isTeamMode ? m.winner_team_id === m.team2_id : m.winner_id === m.participant2_id;
                        return (
                          <div key={m.id} className="border rounded-lg p-3 bg-card text-sm">
                            <div className={`flex justify-between ${w1 ? "font-bold" : ""}`}>
                              <span className="truncate max-w-[120px]">{names.name1}</span>
                              {m.status === "completed" && <span>{m.score1}</span>}
                            </div>
                            <div className="border-t my-2" />
                            <div className={`flex justify-between ${w2 ? "font-bold" : ""}`}>
                              <span className="truncate max-w-[120px]">{names.name2}</span>
                              {m.status === "completed" && <span>{m.score2}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <footer className="text-center py-6 text-xs text-muted-foreground">
          Página pública gerada por <span className="font-semibold">TorneiosPro</span> · atualização em tempo real
        </footer>
      </main>

      {selected && (
        <ShareCard
          open={shareIdx !== null}
          onOpenChange={(v) => !v && setShareIdx(null)}
          name={selected.name}
          position={(shareIdx ?? 0) + 1}
          points={selected.points}
          wins={selected.wins}
          losses={selected.losses}
          tournamentName={tournament.name}
          avatarUrl={selected.avatar_url}
        />
      )}
    </div>
  );
}
