import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SportModality } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, Share2, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as api from "@/lib/supabase-store";
import ImageUpload from "@/components/ImageUpload";

const sports: SportModality[] = [
  "Futebol",
  "Basquete",
  "Beach Tennis",
  "Vôlei",
  "Tênis",
  "Futsal",
  "Handebol",
  "Outro",
];

interface TournamentRow {
  id: string;
  name: string;
  sport: string;
  date: string;
  status: string;
  logo_url?: string | null;
}

export default function Tournaments() {
  const { isOrganizer } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<string>("");
  const [date, setDate] = useState("");
  const [mode, setMode] = useState("solo");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
    const ch = supabase
      .channel("tournaments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => loadTournaments())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function loadTournaments() {
    const data = await api.fetchTournaments();
    setTournaments(data);
    const { data: tps } = await supabase.from("tournament_participants").select("tournament_id");
    const counts: Record<string, number> = {};
    tps?.forEach((tp) => {
      counts[tp.tournament_id] = (counts[tp.tournament_id] || 0) + 1;
    });
    setParticipantCounts(counts);
  }

  const resetForm = () => {
    setName(""); setSport(""); setDate(""); setMode("solo"); setLogoUrl(null); setEditId(null);
  };

  const handleSubmit = async () => {
    if (!name || !sport || !date) return;
    try {
      if (editId) {
        await api.updateTournament(editId, { name, sport, date, mode, logo_url: logoUrl });
      } else {
        await api.createTournament({ name, sport, date, mode, logo_url: logoUrl });
      }
      resetForm();
      setOpen(false);
      loadTournaments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = (t: any) => {
    setName(t.name); setSport(t.sport); setDate(t.date);
    setMode(t.mode || "solo"); setLogoUrl(t.logo_url || null);
    setEditId(t.id); setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try { await api.deleteTournament(id); loadTournaments(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleSharePublic = async (id: string, name: string) => {
    const url = `${window.location.origin}/public/torneio/${id}`;
    try {
      const nav = navigator as any;
      if (nav.share) {
        await nav.share({ title: name, text: `Acompanhe o torneio ${name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link público copiado!");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        await navigator.clipboard.writeText(url);
        toast.success("Link público copiado!");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Torneios</h1>
          <p className="text-muted-foreground mt-1">
            {isOrganizer ? "Gerencie seus torneios esportivos" : "Consulte os torneios disponíveis"}
          </p>
        </div>
        {isOrganizer && (
          <Dialog
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Novo Torneio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Torneio" : "Novo Torneio"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <ImageUpload value={logoUrl} onChange={setLogoUrl} bucket="tournament-logos" label="Logo do torneio" />
                <Input placeholder="Nome do torneio" value={name} onChange={(e) => setName(e.target.value)} />
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Modalidade esportiva" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="text" placeholder="Data (ex: 2026-04-15)" value={date} onChange={(e) => setDate(e.target.value)} />
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Modo de jogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo (individual)</SelectItem>
                    <SelectItem value="duplas">Duplas</SelectItem>
                    <SelectItem value="equipes">Equipes</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSubmit} className="w-full">
                  {editId ? "Salvar" : "Criar Torneio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="card-sport p-12 text-center">
          <p className="text-muted-foreground">Nenhum torneio cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <div key={t.id} className="card-sport p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-lg truncate">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.sport}</p>
                </div>
                <span
                  className={`stat-badge ${t.status === "active" ? "bg-accent/15 text-accent" : t.status === "finished" ? "bg-muted text-muted-foreground" : "bg-sport-orange/15 text-sport-orange"}`}
                >
                  {t.status === "active" ? "Ativo" : t.status === "finished" ? "Finalizado" : "Próximo"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>📅 {t.date}</p>
                <p>👥 {participantCounts[t.id] || 0} participantes</p>
                <p>🎮 {(t as any).mode === "duplas" ? "Duplas" : (t as any).mode === "equipes" ? "Equipes" : "Solo"}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link to={`/tournaments/${t.id}`} className="flex-1 min-w-[80px]">
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    <Eye className="w-3 h-3" /> Ver
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleSharePublic(t.id, t.name)}
                  title="Compartilhar link público"
                >
                  <Share2 className="w-3 h-3" />
                </Button>
                {isOrganizer && (
                  <>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleEdit(t)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
