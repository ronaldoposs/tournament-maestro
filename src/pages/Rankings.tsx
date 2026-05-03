import { useEffect, useState } from "react";
import { Medal, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ShareCard from "@/components/ShareCard";

export default function Rankings() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [shareIdx, setShareIdx] = useState<number | null>(null);

  async function load() {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .order("points", { ascending: false })
      .order("wins", { ascending: false });
    setParticipants(data || []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("rankings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const selected = shareIdx !== null ? participants[shareIdx] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold">Classificação</h1>
        <p className="text-muted-foreground mt-1">Ranking geral · clique no nome para gerar imagem de compartilhamento</p>
      </div>

      {participants.length === 0 ? (
        <div className="card-sport p-12 text-center">
          <Medal className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Sem dados de classificação ainda.</p>
        </div>
      ) : (
        <div className="card-sport overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-center p-4 text-sm font-semibold w-16">#</th>
                <th className="text-left p-4 text-sm font-semibold">Participante</th>
                <th className="text-left p-4 text-sm font-semibold hidden md:table-cell">Equipe</th>
                <th className="text-center p-4 text-sm font-semibold">V</th>
                <th className="text-center p-4 text-sm font-semibold">D</th>
                <th className="text-center p-4 text-sm font-semibold">Pts</th>
                <th className="p-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-center">
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
                  <td className="p-4">
                    <button
                      className="flex items-center gap-3 font-medium hover:text-accent transition-colors text-left"
                      onClick={() => setShareIdx(i)}
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="underline-offset-2 hover:underline">{p.name}</span>
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{p.team || "—"}</td>
                  <td className="p-4 text-center text-accent font-bold">{p.wins}</td>
                  <td className="p-4 text-center text-destructive font-bold">{p.losses}</td>
                  <td className="p-4 text-center">
                    <span className="font-heading font-bold text-lg">{p.points}</span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setShareIdx(i)}
                      className="text-muted-foreground hover:text-accent transition-colors"
                      aria-label="Compartilhar"
                      title="Gerar imagem de compartilhamento"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ShareCard
          open={shareIdx !== null}
          onOpenChange={(v) => !v && setShareIdx(null)}
          name={selected.name}
          position={(shareIdx ?? 0) + 1}
          points={selected.points}
          wins={selected.wins}
          losses={selected.losses}
          avatarUrl={selected.avatar_url}
        />
      )}
    </div>
  );
}
