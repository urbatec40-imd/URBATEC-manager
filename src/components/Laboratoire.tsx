import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/business-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EssaiLaboratoire } from "@/lib/db";

const typesEssai = ["Compression béton", "Essai de traction", "Essai de flexion", "Essai de sol", "Autre"];

export function Laboratoire() {
  const { laboratoire, addLaboratoire, deleteLaboratoire } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<EssaiLaboratoire | null>(null);
  const [form, setForm] = useState({
    numero: "",
    chantier: "",
    typeEssai: "Compression béton",
    date: new Date().toISOString().split("T")[0],
    numeroEprouvette: "",
    dateCoulage: "",
    ageJours: "7",
    poidsKg: "0",
    chargeKn: "0",
    resistanceBar: "0",
    resultat: "En cours",
    observations: "",
  });

  const openNew = () => {
    setForm({
      numero: `LAB-${new Date().getFullYear()}-${String(laboratoire.length + 1).padStart(3, "0")}`,
      chantier: "",
      typeEssai: "Compression béton",
      date: new Date().toISOString().split("T")[0],
      numeroEprouvette: "",
      dateCoulage: "",
      ageJours: "7",
      poidsKg: "0",
      chargeKn: "0",
      resistanceBar: "0",
      resultat: "En cours",
      observations: "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const nouveau: EssaiLaboratoire = {
      id: Date.now(),
      numero: form.numero,
      chantier: form.chantier,
      typeEssai: form.typeEssai,
      date: form.date,
      numeroEprouvette: form.numeroEprouvette,
      dateCoulage: form.dateCoulage,
      ageJours: Number(form.ageJours),
      poidsKg: Number(form.poidsKg),
      chargeKn: Number(form.chargeKn),
      resistanceBar: Number(form.resistanceBar),
      resultat: form.resultat,
      observations: form.observations,
    };
    addLaboratoire(nouveau);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete?.id) {
      deleteLaboratoire(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Laboratoire</h1>
          <p className="mt-1 text-sm text-slate-500">Essais de compression du béton et contrôle qualité</p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Nouvel essai
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">N° Essai</th>
                  <th className="px-4 py-3">Chantier</th>
                  <th className="px-4 py-3">Type d'essai</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">N° Éprouvette</th>
                  <th className="px-4 py-3">Âge (jours)</th>
                  <th className="px-4 py-3">Poids (kg)</th>
                  <th className="px-4 py-3">Charge (kN)</th>
                  <th className="px-4 py-3">Résistance (bar)</th>
                  <th className="px-4 py-3">Résultat</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {laboratoire.map((essai) => (
                  <tr key={essai.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{essai.numero}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.chantier}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.typeEssai}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(essai.date)}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.numeroEprouvette}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.ageJours}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.poidsKg}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.chargeKn}</td>
                    <td className="px-4 py-3 text-slate-600">{essai.resistanceBar}</td>
                    <td className="px-4 py-3">
                      <Badge className={essai.resultat === "Conforme" ? "bg-green-100 text-green-800" : essai.resultat === "À surveiller" ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"}>
                        {essai.resultat}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(essai)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
            <DialogTitle>Nouvel essai laboratoire</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>N° Essai</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <Label>Chantier *</Label>
              <Input value={form.chantier} onChange={(e) => setForm({ ...form, chantier: e.target.value })} />
            </div>
            <div>
              <Label>Type d'essai</Label>
              <Select value={form.typeEssai} onValueChange={(v) => setForm({ ...form, typeEssai: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typesEssai.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>N° Éprouvette</Label>
              <Input value={form.numeroEprouvette} onChange={(e) => setForm({ ...form, numeroEprouvette: e.target.value })} />
            </div>
            <div>
              <Label>Date de coulage</Label>
              <Input type="date" value={form.dateCoulage} onChange={(e) => setForm({ ...form, dateCoulage: e.target.value })} />
            </div>
            <div>
              <Label>Âge (jours)</Label>
              <Input type="number" value={form.ageJours} onChange={(e) => setForm({ ...form, ageJours: e.target.value })} />
            </div>
            <div>
              <Label>Poids (kg)</Label>
              <Input type="number" step="0.1" value={form.poidsKg} onChange={(e) => setForm({ ...form, poidsKg: e.target.value })} />
            </div>
            <div>
              <Label>Charge (kN)</Label>
              <Input type="number" step="0.1" value={form.chargeKn} onChange={(e) => setForm({ ...form, chargeKn: e.target.value })} />
            </div>
            <div>
              <Label>Résistance (bar)</Label>
              <Input type="number" step="0.1" value={form.resistanceBar} onChange={(e) => setForm({ ...form, resistanceBar: e.target.value })} />
            </div>
            <div>
              <Label>Résultat</Label>
              <Select value={form.resultat} onValueChange={(v) => setForm({ ...form, resultat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conforme">Conforme</SelectItem>
                  <SelectItem value="À surveiller">À surveiller</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                </SelectContent>
              </Select>
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