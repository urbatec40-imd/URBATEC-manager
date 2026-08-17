import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, formatMontant, getEtatBadge, genererNumeroDossier } from "@/lib/business-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dossier } from "@/lib/db";

const domaines = [
  "Topographie",
  "Foncier agricole",
  "Foncier urbain",
  "Architecture",
  "Environnement",
  "Laboratoire",
  "Expertise judiciaire",
];

const prestations: Record<string, string[]> = {
  "Topographie": ["Levé topographique", "Calcul de surfaces", "Calcul de cubatures", "Implantation", "PV d'implantation", "AUTRES"],
  "Foncier agricole": ["Permis de forage de puits", "Régularisation terres agricoles", "Instruction 4300", "AUTRES"],
  "Foncier urbain": ["Dossier foncier", "Étude foncière", "AUTRES"],
  "Architecture": ["Régularisation construction", "Loi 15/08", "Permis de démolir", "Permis de construire", "Loi 15/19", "AUTRES"],
  "Environnement": ["Étude environnementale", "Établissement classé", "Décret 07/144", "Audit environnemental", "AUTRES"],
  "Laboratoire": ["Contrôle qualité béton", "Éprouvettes de béton", "Essais de compression", "Contrôle routes et pistes", "AUTRES"],
  "Expertise judiciaire": ["Expertise technique", "Expertise foncière", "Expertise construction", "AUTRES"],
};

const etats = ["NOUVEAU", "EN COURS", "INCOMPLET", "EN ATTENTE", "TERMINÉ", "ANNULÉ"];

export function Dossiers() {
  const { dossiers, clients, addDossier, updateDossier, deleteDossier } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dossier | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dossier | null>(null);
  const [search, setSearch] = useState("");
  const [filterDomaine, setFilterDomaine] = useState("all");
  const [filterEtat, setFilterEtat] = useState("all");
  const [form, setForm] = useState({
    clientId: "",
    reference: "",
    domaine: "",
    prestation: "",
    dateReception: new Date().toISOString().split("T")[0],
    dateLimite: "",
    etatPieces: "Complet",
    piecesManquantes: "",
    prixTotal: "0",
    totalPaye: "0",
    etapeActuelle: "",
    avancement: "0",
    etat: "NOUVEAU",
    observations: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      clientId: clients[0]?.id.toString() || "",
      reference: "",
      domaine: domaines[0],
      prestation: prestations[domaines[0]][0],
      dateReception: new Date().toISOString().split("T")[0],
      dateLimite: "",
      etatPieces: "Complet",
      piecesManquantes: "",
      prixTotal: "0",
      totalPaye: "0",
      etapeActuelle: "",
      avancement: "0",
      etat: "NOUVEAU",
      observations: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (dossier: Dossier) => {
    setEditing(dossier);
    setForm({
      clientId: dossier.clientId.toString(),
      reference: dossier.reference,
      domaine: dossier.domaine,
      prestation: dossier.prestation,
      dateReception: dossier.dateReception,
      dateLimite: dossier.dateLimite,
      etatPieces: dossier.etatPieces,
      piecesManquantes: dossier.piecesManquantes,
      prixTotal: dossier.prixTotal.toString(),
      totalPaye: dossier.totalPaye.toString(),
      etapeActuelle: dossier.etapeActuelle,
      avancement: dossier.avancement.toString(),
      etat: dossier.etat,
      observations: dossier.observations,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const numero = genererNumeroDossier(domaines[0], dossiers);
    const client = clients.find((c) => c.id === Number(form.clientId));
    if (!client) {
      alert("Le client est obligatoire.");
      return;
    }
    if (!form.domaine) {
      alert("Le domaine est obligatoire.");
      return;
    }
    if (!form.prestation) {
      alert("La prestation est obligatoire.");
      return;
    }
    if (!form.dateReception) {
      alert("La date de réception est obligatoire.");
      return;
    }

    const prixTotal = parseFloat(form.prixTotal) || 0;
    const totalPaye = parseFloat(form.totalPaye) || 0;
    const avancement = Math.min(100, Math.max(0, parseInt(form.avancement) || 0));
    const reste = prixTotal - totalPaye;
    const pourcentagePaiement = prixTotal > 0 ? Math.round((totalPaye / prixTotal) * 100) : 0;

    if (editing) {
      updateDossier({
        ...editing,
        clientId: client.id,
        clientNom: client.nom,
        telephone: client.telephone,
        reference: form.reference,
        domaine: form.domaine,
        prestation: form.prestation,
        dateReception: form.dateReception,
        dateLimite: form.dateLimite,
        etatPieces: form.etatPieces,
        piecesManquantes: form.piecesManquantes,
        prixTotal,
        totalPaye,
        reste,
        pourcentagePaiement,
        etapeActuelle: form.etapeActuelle,
        avancement,
        etat: form.etat,
        observations: form.observations,
      });
    } else {
            const nouveau: Dossier = {
        id: Date.now(),
        numero,
        clientId: client.id,
        clientNom: client.nom,
        telephone: client.telephone,
        reference: form.reference,
        domaine: form.domaine,
        prestation: form.prestation,
        dateReception: form.dateReception,
        dateLimite: form.dateLimite,
        etatPieces: form.etatPieces,
        piecesManquantes: form.piecesManquantes,
        prixTotal,
        totalPaye,
        reste,
        pourcentagePaiement,
        etapeActuelle: form.etapeActuelle,
        avancement,
        etat: form.etat,
        observations: form.observations,
      };
      addDossier(nouveau);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete?.id) {
      deleteDossier(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const filteredDossiers = dossiers.filter((dossier) => {
    const matchesSearch =
      dossier.numero.toLowerCase().includes(search.toLowerCase()) ||
      dossier.clientNom.toLowerCase().includes(search.toLowerCase()) ||
      dossier.telephone.includes(search) ||
      dossier.reference.toLowerCase().includes(search.toLowerCase()) ||
      dossier.domaine.toLowerCase().includes(search.toLowerCase()) ||
      dossier.prestation.toLowerCase().includes(search.toLowerCase());
    const matchesDomaine = filterDomaine === "all" || dossier.domaine === filterDomaine;
    const matchesEtat = filterEtat === "all" || dossier.etat === filterEtat;
    return matchesSearch && matchesDomaine && matchesEtat;
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Dossiers</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des dossiers techniques</p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Nouveau dossier
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterDomaine} onValueChange={setFilterDomaine}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par domaine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les domaines</SelectItem>
            {domaines.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEtat} onValueChange={setFilterEtat}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par état" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les états</SelectItem>
            {etats.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">N° Dossier</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Domaine</th>
                  <th className="px-4 py-3">Prestation</th>
                  <th className="px-4 py-3">Date réception</th>
                  <th className="px-4 py-3">Date limite</th>
                  <th className="px-4 py-3">Prix total</th>
                  <th className="px-4 py-3">Payé</th>
                  <th className="px-4 py-3">Reste</th>
                  <th className="px-4 py-3">% Paiement</th>
                  <th className="px-4 py-3">Avancement</th>
                  <th className="px-4 py-3">État</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDossiers.map((dossier) => (
                  <tr key={dossier.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{dossier.numero}</td>
                    <td className="px-4 py-3 text-slate-700">{dossier.clientNom}</td>
                    <td className="px-4 py-3 text-slate-600">{dossier.telephone}</td>
                    <td className="px-4 py-3 text-slate-600">{dossier.domaine}</td>
                    <td className="px-4 py-3 text-slate-600">{dossier.prestation}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(dossier.dateReception)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(dossier.dateLimite)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatMontant(dossier.prixTotal)}</td>
                    <td className="px-4 py-3 text-green-600">{formatMontant(dossier.totalPaye)}</td>
                    <td className="px-4 py-3 text-orange-600">{formatMontant(dossier.reste)}</td>
                    <td className="px-4 py-3">
                      <Badge className={dossier.pourcentagePaiement === 100 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                        {dossier.pourcentagePaiement}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={dossier.avancement} className="h-2 w-16" />
                        <span className="text-xs text-slate-600">{dossier.avancement}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getEtatBadge(dossier.etat)}>{dossier.etat}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Voir">
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Modifier" onClick={() => openEdit(dossier)}>
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(dossier)}>
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
            <DialogTitle>{editing ? "Modifier le dossier" : "Nouveau dossier"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Référence</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <Label>Domaine *</Label>
              <Select value={form.domaine} onValueChange={(v) => {
                setForm({ ...form, domaine: v, prestation: prestations[v]?.[0] || "" });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domaines.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Prestation *</Label>
              <Select value={form.prestation} onValueChange={(v) => setForm({ ...form, prestation: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prestations[form.domaine]?.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de réception *</Label>
              <Input type="date" value={form.dateReception} onChange={(e) => setForm({ ...form, dateReception: e.target.value })} />
            </div>
            <div>
              <Label>Date limite</Label>
              <Input type="date" value={form.dateLimite} onChange={(e) => setForm({ ...form, dateLimite: e.target.value })} />
            </div>
            <div>
              <Label>État des pièces</Label>
              <Select value={form.etatPieces} onValueChange={(v) => setForm({ ...form, etatPieces: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complet">Complet</SelectItem>
                  <SelectItem value="Incomplet">Incomplet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pièces manquantes</Label>
              <Input value={form.piecesManquantes} onChange={(e) => setForm({ ...form, piecesManquantes: e.target.value })} />
            </div>
            <div>
              <Label>Prix total (DA)</Label>
              <Input type="number" value={form.prixTotal} onChange={(e) => setForm({ ...form, prixTotal: e.target.value })} />
            </div>
            <div>
              <Label>Total payé (DA)</Label>
              <Input type="number" value={form.totalPaye} onChange={(e) => setForm({ ...form, totalPaye: e.target.value })} />
            </div>
            <div>
              <Label>Étape actuelle</Label>
              <Input value={form.etapeActuelle} onChange={(e) => setForm({ ...form, etapeActuelle: e.target.value })} />
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
              <Label>Observations</Label>
              <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">
              {editing ? "Mettre à jour" : "Enregistrer"}
            </Button>
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