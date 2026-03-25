import { useStore } from "@/hooks/useStore";
import { Medal } from "lucide-react";

export default function Rankings() {
  const participants = useStore((s) => s.getParticipants());
  const sorted = [...participants].sort((a, b) => b.points - a.points || b.wins - a.wins);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold">Classificação</h1>
        <p className="text-muted-foreground mt-1">Ranking geral de participantes</p>
      </div>

      {sorted.length === 0 ? (
        <div className="card-sport p-12 text-center">
          <Medal className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Sem dados de classificação ainda.</p>
        </div>
      ) : (
        <div className="card-sport overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-center p-4 text-sm font-semibold w-16">#</th>
                <th className="text-left p-4 text-sm font-semibold">Participante</th>
                <th className="text-left p-4 text-sm font-semibold">Equipe</th>
                <th className="text-center p-4 text-sm font-semibold">Vitórias</th>
                <th className="text-center p-4 text-sm font-semibold">Derrotas</th>
                <th className="text-center p-4 text-sm font-semibold">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-center">
                    <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-sport-gold text-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : i === 2 ? "bg-sport-orange/20 text-sport-orange" : ""}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4 text-muted-foreground">{p.team || "—"}</td>
                  <td className="p-4 text-center text-accent font-bold">{p.wins}</td>
                  <td className="p-4 text-center text-destructive font-bold">{p.losses}</td>
                  <td className="p-4 text-center">
                    <span className="font-heading font-bold text-lg">{p.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
