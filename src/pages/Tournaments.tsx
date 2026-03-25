import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SportModality } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as api from "@/lib/supabase-store";

const sports: SportModality[] = ["Futebol", "Basquete", "Vôlei", "Tênis", "Futsal", "Handebol", "Outro"];

interface TournamentRow {
  id: string;
  name: string;
  sport: string;
  date: string;
  status: string;
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

  useEffect(() => { loadTournaments(); }, []);

  async function loadTournaments() {
    const data = await api.fetchTournaments();
    setTournaments(data);
    // Fetch participant counts
    const { data: tps } = await supabase.from("tournament_participants").select("tournament_id");
    const counts: Record<string, number> = {};
    tps?.forEach((tp) => { counts[tp.tournament_id] = (counts[tp.tournament_id] || 0) + 1; });
    setParticipantCounts(counts);
  }

  const resetForm = () => { setName(""); setSport(""); setDate(""); setEditId(null); };

  const handleSubmit = async () => {
    if (!name || !sport || !date) return;
    try {
      if (editId) {
        await api.updateTournament(editId, { name, sport, date });
      } else {
        await api.createTournament({ name, sport, date });
      }
      resetForm();
      setOpen(false);
      loadTournaments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = (t: TournamentRow) => {
    setName(t.name);
    setSport(t.sport);
    setDate(t.date);
    setEditId(t.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTournament(id);
      loadTournaments();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Torneios</h1>
          <p className="text-muted-foreground mt-1">
            {isOrganizer ? "Gerencie seus torneios esportivos" : "Consulte os torneios disponíveis"}
          </p>
        </div>
        {isOrganizer && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Torneio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Torneio" : "Novo Torneio"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Nome do torneio" value={name} onChange={(e) => setName(e.target.value)} />
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger><SelectValue placeholder="Modalidade esportiva" /></SelectTrigger>
                  <SelectContent>
                    {sports.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="text" placeholder="Data (ex: 2026-04-15)" value={date} onChange={(e) => setDate(e.target.value)} />
                <Button onClick={handleSubmit} className="w-full">{editId ? "Salvar" : "Criar Torneio"}</Button>
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
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.sport}</p>
                </div>
                <span className={`stat-badge ${t.status === "active" ? "bg-accent/15 text-accent" : t.status === "finished" ? "bg-muted text-muted-foreground" : "bg-sport-orange/15 text-sport-orange"}`}>
                  {t.status === "active" ? "Ativo" : t.status === "finished" ? "Finalizado" : "Próximo"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>📅 {t.date}</p>
                <p>👥 {participantCounts[t.id] || 0} participantes</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/tournaments/${t.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1"><Eye className="w-3 h-3" /> Ver</Button>
                </Link>
                {isOrganizer && (
                  <>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleEdit(t)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
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
