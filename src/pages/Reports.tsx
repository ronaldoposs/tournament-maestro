import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FileDown, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Participant {
  id: string;
  name: string;
  team: string | null;
  wins: number;
  losses: number;
  draws: number;
  points: number;
}

interface MatchRow {
  id: string;
  tournament_id: string;
  round: number;
  score1: number | null;
  score2: number | null;
  status: string;
  participant1_id: string | null;
  participant2_id: string | null;
  winner_id: string | null;
}

interface Tournament {
  id: string;
  name: string;
}

const COLORS = [
  "hsl(150, 70%, 40%)",
  "hsl(25, 95%, 55%)",
  "hsl(220, 60%, 20%)",
  "hsl(45, 90%, 55%)",
  "hsl(0, 84%, 60%)",
  "hsl(200, 70%, 50%)",
];

export default function Reports() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string>("all");
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: p }, { data: t }, { data: m }] = await Promise.all([
      supabase.from("participants").select("*").order("points", { ascending: false }),
      supabase.from("tournaments").select("id, name"),
      supabase.from("matches").select("*").eq("status", "completed"),
    ]);
    setParticipants(p || []);
    setTournaments(t || []);
    setMatches(m || []);
  }

  const getTournamentName = (id: string) => tournaments.find((t) => t.id === id)?.name || "—";
  const getParticipantName = (id: string | null) => participants.find((p) => p.id === id)?.name || "—";

  // Chart data: ranking
  const rankingData = participants.slice(0, 10).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    Pontos: p.points,
    Vitórias: p.wins,
  }));

  // Chart data: single participant pie
  const selectedP = participants.find((p) => p.id === selectedParticipant);
  const pieData = selectedP
    ? [
        { name: "Vitórias", value: selectedP.wins },
        { name: "Derrotas", value: selectedP.losses },
        { name: "Empates", value: selectedP.draws },
      ].filter((d) => d.value > 0)
    : [];

  // Match history for selected participant
  const participantMatches = selectedParticipant !== "all"
    ? matches.filter((m) => m.participant1_id === selectedParticipant || m.participant2_id === selectedParticipant)
    : matches;

  // CSV export
  function exportCSV() {
    const rows = [["Posição", "Nome", "Equipe", "Vitórias", "Derrotas", "Empates", "Pontos"]];
    participants.forEach((p, i) => {
      rows.push([(i + 1).toString(), p.name, p.team || "", p.wins.toString(), p.losses.toString(), p.draws.toString(), p.points.toString()]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ranking_torneios.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Simple PDF export (print-based)
  function exportPDF() {
    window.print();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Desempenho e histórico de partidas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCSV}>
            <FileDown className="w-4 h-4" /> CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportPDF}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Ranking Chart */}
      <div className="card-sport p-6">
        <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" /> Ranking Geral
        </h2>
        {rankingData.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem dados ainda.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Pontos" fill="hsl(150, 70%, 40%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Vitórias" fill="hsl(25, 95%, 55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Per-participant section */}
      <div className="card-sport p-6">
        <h2 className="text-xl font-heading font-bold mb-4">Desempenho Individual</h2>
        <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
          <SelectTrigger className="w-64 mb-4"><SelectValue placeholder="Selecione um participante" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedP && pieData.length > 0 && (
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Match History Table */}
        <h3 className="font-heading font-bold mb-3">Histórico de Partidas</h3>
        {participantMatches.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma partida registrada.</p>
        ) : (
          <div ref={tableRef} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Torneio</th>
                  <th className="text-left p-3 font-semibold">Rodada</th>
                  <th className="text-left p-3 font-semibold">Jogador 1</th>
                  <th className="text-center p-3 font-semibold">Placar</th>
                  <th className="text-left p-3 font-semibold">Jogador 2</th>
                  <th className="text-left p-3 font-semibold">Vencedor</th>
                </tr>
              </thead>
              <tbody>
                {participantMatches.slice(0, 50).map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">{getTournamentName(m.tournament_id)}</td>
                    <td className="p-3">{m.round}</td>
                    <td className="p-3">{getParticipantName(m.participant1_id)}</td>
                    <td className="p-3 text-center font-heading font-bold">{m.score1} × {m.score2}</td>
                    <td className="p-3">{getParticipantName(m.participant2_id)}</td>
                    <td className="p-3 text-accent font-semibold">{getParticipantName(m.winner_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Ranking Table */}
      <div className="card-sport p-6 print:break-before-page">
        <h2 className="text-xl font-heading font-bold mb-4">Ranking Completo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-center p-3 font-semibold w-12">#</th>
                <th className="text-left p-3 font-semibold">Nome</th>
                <th className="text-left p-3 font-semibold">Equipe</th>
                <th className="text-center p-3 font-semibold">V</th>
                <th className="text-center p-3 font-semibold">D</th>
                <th className="text-center p-3 font-semibold">E</th>
                <th className="text-center p-3 font-semibold">Pts</th>
                <th className="text-center p-3 font-semibold">Aproveitamento</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => {
                const total = p.wins + p.losses + p.draws;
                const pct = total > 0 ? ((p.wins / total) * 100).toFixed(1) : "—";
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-center">
                      <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-sport-gold text-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : i === 2 ? "bg-sport-orange/20 text-sport-orange" : ""}`}>{i + 1}</span>
                    </td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{p.team || "—"}</td>
                    <td className="p-3 text-center text-accent font-bold">{p.wins}</td>
                    <td className="p-3 text-center text-destructive font-bold">{p.losses}</td>
                    <td className="p-3 text-center">{p.draws}</td>
                    <td className="p-3 text-center font-heading font-bold text-lg">{p.points}</td>
                    <td className="p-3 text-center">{pct === "—" ? "—" : `${pct}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
