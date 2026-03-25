import { useState } from "react";
import { useStore } from "@/hooks/useStore";
import { store } from "@/lib/store";
import { SportModality } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const sports: SportModality[] = ["Futebol", "Basquete", "Vôlei", "Tênis", "Futsal", "Handebol", "Outro"];

export default function Tournaments() {
  const tournaments = useStore((s) => s.getTournaments());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState<string>("");
  const [date, setDate] = useState("");

  const resetForm = () => { setName(""); setSport(""); setDate(""); setEditId(null); };

  const handleSubmit = () => {
    if (!name || !sport || !date) return;
    if (editId) {
      store.updateTournament(editId, { name, sport, date });
    } else {
      store.addTournament({ name, sport, date });
    }
    resetForm();
    setOpen(false);
  };

  const handleEdit = (id: string) => {
    const t = store.getTournament(id);
    if (t) {
      setName(t.name);
      setSport(t.sport);
      setDate(t.date);
      setEditId(id);
      setOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Torneios</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus torneios esportivos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
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
              <Input placeholder="Nome do torneio" value={name} onChange={(e) => setName(e.target.value)} />
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger><SelectValue placeholder="Modalidade esportiva" /></SelectTrigger>
                <SelectContent>
                  {sports.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button onClick={handleSubmit} className="w-full">{editId ? "Salvar" : "Criar Torneio"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tournaments.length === 0 ? (
        <div className="card-sport p-12 text-center">
          <p className="text-muted-foreground">Nenhum torneio cadastrado. Crie o primeiro!</p>
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
                <p>👥 {t.participants.length} participantes</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/tournaments/${t.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1"><Eye className="w-3 h-3" /> Ver</Button>
                </Link>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleEdit(t.id)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => store.deleteTournament(t.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
