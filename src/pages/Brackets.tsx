import { useStore } from "@/hooks/useStore";
import { Link } from "react-router-dom";
import { GitBranch } from "lucide-react";

export default function Brackets() {
  const tournaments = useStore((s) => s.getTournaments());
  const activeTournaments = tournaments.filter((t) => t.status === "active" || t.status === "finished");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold">Chaveamentos</h1>
        <p className="text-muted-foreground mt-1">Visualize os chaveamentos dos torneios</p>
      </div>

      {activeTournaments.length === 0 ? (
        <div className="card-sport p-12 text-center">
          <GitBranch className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum chaveamento gerado ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">Crie um torneio, adicione participantes e gere o chaveamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTournaments.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`} className="card-sport p-6 hover:ring-2 hover:ring-accent transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg accent-gradient flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-heading font-bold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.sport}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.participants.length} participantes</span>
                <span className={`stat-badge ${t.status === "active" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                  {t.status === "active" ? "Em andamento" : "Finalizado"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
