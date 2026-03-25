import { useEffect, useState } from "react";
import { Trophy, Users, GitBranch, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
      supabase.from("participants").select("*").order("points", { ascending: false }),
    ]).then(([{ data: t }, { data: p }]) => {
      setTournaments(t || []);
      setParticipants(p || []);
    });
  }, []);

  const active = tournaments.filter((t) => t.status === "active").length;
  const finished = tournaments.filter((t) => t.status === "finished").length;

  const stats = [
    { label: "Total de Torneios", value: tournaments.length, icon: Trophy, color: "bg-accent text-accent-foreground" },
    { label: "Participantes", value: participants.length, icon: Users, color: "bg-sport-orange text-sport-orange-foreground" },
    { label: "Em Andamento", value: active, icon: GitBranch, color: "bg-primary text-primary-foreground" },
    { label: "Finalizados", value: finished, icon: TrendingUp, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos seus torneios esportivos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="card-sport p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-heading font-bold mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center`}>
                <s.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-sport p-6">
          <h2 className="text-xl font-heading font-bold mb-4">Torneios Recentes</h2>
          {tournaments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum torneio cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {tournaments.slice(0, 5).map((t) => (
                <Link key={t.id} to={`/tournaments/${t.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.sport} • {t.date}</p>
                  </div>
                  <span className={`stat-badge ${t.status === "active" ? "bg-accent/15 text-accent" : t.status === "finished" ? "bg-muted text-muted-foreground" : "bg-sport-orange/15 text-sport-orange"}`}>
                    {t.status === "active" ? "Ativo" : t.status === "finished" ? "Finalizado" : "Próximo"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card-sport p-6">
          <h2 className="text-xl font-heading font-bold mb-4">Top Participantes</h2>
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum participante cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {participants.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-sport-gold text-foreground" : i === 1 ? "bg-muted text-muted-foreground" : "bg-sport-orange/20 text-sport-orange"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.team || "Individual"}</p>
                  </div>
                  <span className="font-heading font-bold text-accent">{p.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
