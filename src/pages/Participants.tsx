import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import * as api from "@/lib/supabase-store";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";

export default function Participants() {
  const { isOrganizer } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => { loadParticipants(); }, []);

  async function loadParticipants() {
    const data = await api.fetchParticipants();
    setParticipants(data);
  }

  const resetForm = () => { setName(""); setTeam(""); setAvatarUrl(null); setEditId(null); };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      if (editId) {
        await api.updateParticipant(editId, { name: name.trim(), team: team.trim() || null, avatar_url: avatarUrl });
      } else {
        await api.createParticipant({ name: name.trim(), team: team.trim() || undefined, avatar_url: avatarUrl });
      }
      resetForm();
      setOpen(false);
      loadParticipants();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (p: any) => {
    setName(p.name);
    setTeam(p.team || "");
    setAvatarUrl(p.avatar_url || null);
    setEditId(p.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteParticipant(id);
      loadParticipants();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Participantes</h1>
          <p className="text-muted-foreground mt-1">Gerencie atletas e equipes</p>
        </div>
        {isOrganizer && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Participante</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Participante" : "Novo Participante"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <ImageUpload value={avatarUrl} onChange={setAvatarUrl} bucket="participant-avatars" label="Foto" shape="circle" />
                <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Equipe (opcional)" value={team} onChange={(e) => setTeam(e.target.value)} />
                <Button onClick={handleSubmit} className="w-full">{editId ? "Salvar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="card-sport p-12 text-center">
          <p className="text-muted-foreground">Nenhum participante cadastrado.</p>
        </div>
      ) : (
        <div className="card-sport overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold">Nome</th>
                <th className="text-left p-4 text-sm font-semibold hidden md:table-cell">Equipe</th>
                <th className="text-center p-4 text-sm font-semibold">V</th>
                <th className="text-center p-4 text-sm font-semibold">D</th>
                <th className="text-center p-4 text-sm font-semibold">Pts</th>
                {isOrganizer && <th className="text-right p-4 text-sm font-semibold">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{p.team || "—"}</td>
                  <td className="p-4 text-center text-accent font-bold">{p.wins}</td>
                  <td className="p-4 text-center text-destructive font-bold">{p.losses}</td>
                  <td className="p-4 text-center font-heading font-bold">{p.points}</td>
                  {isOrganizer && (
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
