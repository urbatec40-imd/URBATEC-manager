import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, joursRestants, getEtatBadge, getAvancementColor } from "@/lib/business-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Expertise } from "@/lib/db";

const juridictions = ["Tribunal de Khenchela — Section foncière", "Tribunal administratif", "Cour de Khenchela", "Autre juridiction"];
const etats = ["NOUVEAU", "EN COURS", "EN ATTENTE", "TERMINÉ"];

export function Expertises() {
  const { expertises, addExpertise, updateExpertise, deleteExpertise } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expertise | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expertise | null>(null);
  const [form, setForm] = useState({
    numero: "",
    partie: "",
    dateReception: "",
    delaiAccorde: "30",
    dateLimite: "",
    juridiction: "",
    mission: "",
    avancement: "0",
    etat: "NOUVEAU",
    observations: "",
    dateDepot: "",
    referenceDossier: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      numero: `EXP-${new Date().getFullYear()}-${String(expertises.length + 1).padStart(3, "0")}`,
      partie: "",
      dateReception: new Date().toISOString().split("T")[0],
      delaiAccorde: "30",
      dateLimite: "",
      juridiction: "",
      mission: "",
      avancement: "0",
      etat: "NOUVEAU",
      observations: "",
      dateDepot: "",
      referenceDossier: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (expertise: Expertise) => {
    setEditing(expertise);
    setForm({
      numero: expertise.numero,
      partie: expertise.partie,
      dateReception: expertise.dateReception,
      delaiAccorde: expertise.delaiAccorde.toString(),
      dateLimite: expertise.dateLimite,
      juridiction: expertise.juridiction,
      mission: expertise.mission,
      avancement: expertise.avancement.toString(),
      etat: expertise.etat,
      observations: expertise.observations,
      dateDepot: expertise.dateDepot,
      referenceDossier: expertise.referenceDossier,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const avancement = Math.min(100, Math.max(0, Number(form.avancement) || 0));
    const dateLimite = form.dateLimite || new Date(new Date(form.dateReception).getTime() + Number(form.delaiAccorde) * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (editing) {
      const updated: Expertise = {
        ...editing,
        partie: form.partie,
        dateReception: form.dateReception,
        delaiAccorde: Number(form.delaiAccorde),
        dateLimite,
        joursRestants: joursRestants(dateLimite),
        juridiction: form.juridiction,
        mission: form.mission,
        avancement,
        etat: form.etat,
        observations: form.observations,
        dateDepot: form.dateDepot,
        referenceDossier: form.referenceDossier,
      };
      updateExpertise(updated);
    } else {
      const nouveau: Expertise = {
        id: Date.now(),
        numero: form.numero,
        partie: form.partie,
        dateReception: form.dateReception,
        delaiAccorde: Number(form.delaiAccorde),
        dateLimite,
        joursRestants: joursRestants(dateLimite),
        juridiction: form.juridiction,
        mission: form.mission,
        avancement,
        etat: form.etat,
        observations: form.observations,
        dateDepot: form.dateDepot,
        referenceDossier: form.referenceDossier,
      };
      addExpertise(nouveau);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete?.id) {
      deleteExpertise(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Expertises judiciaires</h1>
          <p className="mt-1 text-sm text-slate-500">Suivi des expertises ordonnées par les juridictions</p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle expertise
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">N° Expertise</th>
                  <th className="px-4 py-3">Partie / Demandeur</th>
                  <th className="px-4 py-3">Juridiction</th>
                  <th className="px-4 py-3">Mission</th>
                  <th className="px-4 py-3">Date limite</th>
                  <th className="px-4 py-3">Jours restants</th>
                  <th className="px-4 py-3">Avancement</th>
                  <th className="px-4 py-3">État</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expertises.map((expertise) => (
                  <tr key={expertise.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{expertise.numero}</td>
                    <td className="px-4 py-3 text-slate-600">{expertise.partie}</td>
                    <td className="px-4 py-3 text-slate-600">{expertise.juridiction}</td>
                    <td className="px-4 py-3 text-slate-600">{expertise.mission}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(expertise.dateLimite)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${expertise.joursRestants < 0 ? "text-red-600" : expertise.joursRestants <= 7 ? "text-orange-600" : "text-green-600"}`}>
                        {expertise.joursRestants < 0 ? `${Math.abs(expertise.joursRestants)}j retard` : `${expertise.joursRestants}j`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={expertise.avancement} className="w-16" indicatorClassName={getAvancementColor(expertise.avancement)} />
                        <span className="text-xs text-slate-600">{expertise.avancement}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getEtatBadge(expertise.etat)}>{expertise.etat}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(expertise)}>
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(expertise)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'expertise" : "Nouvelle expertise"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>N° Expertise</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <Label>Partie / Demandeur *</Label>
              <Input value={form.partie} onChange={(e) => setForm({ ...form, partie: e.target.value })} />
            </div>
            <div>
              <Label>Date réception</Label>
              <Input type="date" value={form.dateReception} onChange={(e) => setForm({ ...form, dateReception: e.target.value })} />
            </div>
            <div>
              <Label>Délai accordé (jours)</Label>
              <Input type="number" value={form.delaiAccorde} onChange={(e) => setForm({ ...form, delaiAccorde: e.target.value })} />
            </div>
            <div>
              <Label>Juridiction</Label>
              <Select value={form.juridiction} onValueChange={(v) => setForm({ ...form, juridiction: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {juridictions.map((j) => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Référence dossier</Label>
              <Input value={form.referenceDossier} onChange={(e) => setForm({ ...form, referenceDossier: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Mission</Label>
              <Input value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
            </div>
            <div>
              <Label>Avancement (%)</Label>
              <Input type="number" min="0" max="100" value={form.avancement} onChange={(e) => setForm({ ...form, avancement: e.target.value })} />
            </div>
            <div>
              <Label>État</Label>
              <Select value={form.etat} onValueChange={(v) => setForm({ ...form, etat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {etats.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Date dépôt du rapport</Label>
              <Input type="date" value={form.dateDepot} onChange={(e) => setForm({ ...form, dateDepot: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Observations</Label>
              <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Voulez-vous réellement supprimer cet élément ?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Non</Button>
            <Button variant="destructive" onClick={handleDelete}>Oui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}