import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, formatMontant } from "@/lib/business-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paiement } from "@/lib/db";

const modes = ["ESPÈCES", "VIREMENT", "CHÈQUE", "AUTRE"];

export function Paiements() {
  const { paiements, dossiers, addPaiement, deletePaiement } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Paiement | null>(null);
  const [form, setForm] = useState({
    dossierId: "",
    date: new Date().toISOString().split("T")[0],
    montant: "0",
    mode: "ESPÈCES",
    reference: "",
    observation: "",
  });

  const openNew = () => {
    setForm({
      dossierId: dossiers[0]?.id.toString() || "",
      date: new Date().toISOString().split("T")[0],
      montant: "0",
      mode: "ESPÈCES",
      reference: "",
      observation: "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const dossier = dossiers.find((d) => d.id === Number(form.dossierId));
    if (!dossier) return;

    const nouveau: Paiement = {
      id: Date.now(),
      dossierId: dossier.id,
      numeroDossier: dossier.numero,
      date: form.date,
      montant: Number(form.montant) || 0,
      mode: form.mode,
      reference: form.reference,
      observation: form.observation,
    };
    addPaiement(nouveau);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete?.id) {
      deletePaiement(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Paiements</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des encaissements</p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Nouveau paiement
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">N° Dossier</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Observation</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((paiement) => (
                  <tr key={paiement.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{paiement.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{paiement.numeroDossier}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(paiement.date)}</td>
                    <td className="px-4 py-3 font-medium text-green-600">{formatMontant(paiement.montant)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {paiement.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{paiement.reference || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{paiement.observation || "-"}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(paiement)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau paiement</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Dossier *</Label>
              <Select value={form.dossierId} onValueChange={(v) => setForm({ ...form, dossierId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dossiers.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.numero} - {d.clientNom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Montant (DA)</Label>
              <Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Référence</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Observation</Label>
              <Input value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
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