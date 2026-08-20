import { useState } from "react";
import { Plus, Pencil, Trash2, MapPin, FolderOpen, Phone, Mail, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatMontant, formatDate, getEtatBadge } from "@/lib/business-utils";
import { communesKhenchela } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Client } from "@/lib/db";

type ClientIdentity = {
  numeroCarteIdentite?: string;
  numeroIdentificationNational?: string;
  dateDelivranceCarteIdentite?: string;
  autoriteDelivranceCarteIdentite?: string;
};

type ClientWithIdentity = Client & ClientIdentity;

export function Clients() {
  const { clients, dossiers, addClient, updateClient, deleteClient } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientWithIdentity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    numeroCarteIdentite: "",
    numeroIdentificationNational: "",
    dateDelivranceCarteIdentite: "",
    autoriteDelivranceCarteIdentite: "",
    observations: "",
    wilaya: "Khenchela",
    daïra: "",
    commune: "",
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      nom: "",
      telephone: "",
      email: "",
      adresse: "",
      numeroCarteIdentite: "",
      numeroIdentificationNational: "",
      dateDelivranceCarteIdentite: "",
      autoriteDelivranceCarteIdentite: "",
      observations: "",
      wilaya: "Khenchela",
      daïra: "",
      commune: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    const clientWithIdentity = client as ClientWithIdentity;
    setEditing(clientWithIdentity);
    setForm({
      nom: client.nom,
      telephone: client.telephone,
      email: client.email,
      adresse: client.adresse,
      numeroCarteIdentite: clientWithIdentity.numeroCarteIdentite || "",
      numeroIdentificationNational: clientWithIdentity.numeroIdentificationNational || "",
      dateDelivranceCarteIdentite: clientWithIdentity.dateDelivranceCarteIdentite || "",
      autoriteDelivranceCarteIdentite: clientWithIdentity.autoriteDelivranceCarteIdentite || "",
      observations: client.observations,
      wilaya: client.wilaya || "Khenchela",
      daïra: client.daïra || "",
      commune: client.commune || "",
    });
    setDialogOpen(true);
  };

  const handleCommuneChange = (commune: string) => {
    const found = communesKhenchela.find((c) => c.commune === commune);
    setForm({
      ...form,
      commune,
      daïra: found ? found.daïra : "",
    });
  };

  const handleSave = () => {
    if (!form.nom) {
      alert("Le nom du client est obligatoire.");
      return;
    }

    if (editing) {
      updateClient({ ...editing, ...form });
    } else {
      const nouveau: Client = {
        id: Date.now(),
        ...form,
        nif: "",
        section: "",
        ilot: "",
      };
      addClient(nouveau);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete?.id) {
      deleteClient(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(search.toLowerCase()) ||
    client.telephone.includes(search) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  const getClientStats = (clientId: number) => {
    const clientDossiers = dossiers.filter((d) => d.clientId === clientId);
    const totalFacture = clientDossiers.reduce((sum, d) => sum + d.prixTotal, 0);
    const totalPaye = clientDossiers.reduce((sum, d) => sum + d.totalPaye, 0);
    const reste = totalFacture - totalPaye;
    return { count: clientDossiers.length, totalFacture, totalPaye, reste };
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedClientWithIdentity = selectedClient as ClientWithIdentity | undefined;
  const selectedClientDossiers = dossiers.filter((d) => d.clientId === selectedClientId);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Gestion des clients et de leurs dossiers</p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Nouveau client
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Rechercher un client..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          {filteredClients.map((client) => {
            const stats = getClientStats(client.id);
            return (
              <Card
                key={client.id}
                className={`cursor-pointer border-slate-200 shadow-sm transition-all hover:shadow-md ${
                  selectedClientId === client.id ? "ring-2 ring-slate-900" : ""
                }`}
                onClick={() => setSelectedClientId(client.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{client.nom}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Phone className="h-3 w-3" /> {client.telephone}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Mail className="h-3 w-3" /> {client.email || "-"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-3 w-3" /> {client.commune || "Khenchela"}, {client.wilaya || "Khenchela"}
                      </p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700">
                      {stats.count} dossier{stats.count > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Facturé</p>
                      <p className="font-semibold text-slate-900">{formatMontant(stats.totalFacture)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Payé</p>
                      <p className="font-semibold text-green-600">{formatMontant(stats.totalPaye)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reste</p>
                      <p className="font-semibold text-orange-600">{formatMontant(stats.reste)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedClient ? (
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-slate-900">{selectedClient.nom}</h2>
                      <div className="mt-2 space-y-1 text-sm text-slate-600">
                        <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {selectedClient.telephone}</p>
                        <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {selectedClient.email || "-"}</p>
                        <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {selectedClient.adresse}</p>
                        {selectedClientWithIdentity?.numeroCarteIdentite && <p className="text-xs text-slate-500">N° Carte d'identité nationale : {selectedClientWithIdentity.numeroCarteIdentite}</p>}
                        {selectedClientWithIdentity?.numeroIdentificationNational && <p className="text-xs text-slate-500">N° Identification national : {selectedClientWithIdentity.numeroIdentificationNational}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(selectedClient)}>
                        <Pencil className="mr-2 h-3 w-3" /> Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmDelete(selectedClient)}>
                        <Trash2 className="mr-2 h-3 w-3 text-red-500" /> Supprimer
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Wilaya</p>
                      <p className="font-medium text-slate-900">{selectedClient.wilaya || "Khenchela"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Daïra</p>
                      <p className="font-medium text-slate-900">{selectedClient.daïra || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Commune</p>
                      <p className="font-medium text-slate-900">{selectedClient.commune || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">N° Carte d'identité nationale</p>
                      <p className="font-medium text-slate-900">{selectedClientWithIdentity?.numeroCarteIdentite || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">N° Identification national</p>
                      <p className="font-medium text-slate-900">{selectedClientWithIdentity?.numeroIdentificationNational || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date de délivrance</p>
                      <p className="font-medium text-slate-900">{selectedClientWithIdentity?.dateDelivranceCarteIdentite || "-"}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-xs text-slate-500">Autorité de délivrance</p>
                      <p className="font-medium text-slate-900">{selectedClientWithIdentity?.autoriteDelivranceCarteIdentite || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Dossiers du client</h3>
                    <Badge className="bg-slate-100 text-slate-700">
                      {selectedClientDossiers.length} dossier{selectedClientDossiers.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2">N° Dossier</th>
                          <th className="px-3 py-2">Domaine</th>
                          <th className="px-3 py-2">Prestation</th>
                          <th className="px-3 py-2">Date limite</th>
                          <th className="px-3 py-2">Avancement</th>
                          <th className="px-3 py-2">État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClientDossiers.map((dossier) => (
                          <tr key={dossier.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium text-slate-900">{dossier.numero}</td>
                            <td className="px-3 py-2 text-slate-600">{dossier.domaine}</td>
                            <td className="px-3 py-2 text-slate-600">{dossier.prestation}</td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(dossier.dateLimite)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Progress value={dossier.avancement} className="h-2 w-20" />
                                <span className="text-xs text-slate-600">{dossier.avancement}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Badge className={getEtatBadge(dossier.etat)}>{dossier.etat}</Badge>
                            </td>
                          </tr>
                        ))}
                        {selectedClientDossiers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                              Aucun dossier pour ce client
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex h-full items-center justify-center border-dashed border-slate-200 bg-slate-50/50">
              <CardContent className="p-12 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 font-semibold text-slate-700">Sélectionnez un client</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cliquez sur un client pour voir ses informations et ses dossiers
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom / Raison sociale *</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>

            <div>
              <Label>N° Carte d'identité nationale</Label>
              <Input value={form.numeroCarteIdentite} onChange={(e) => setForm({ ...form, numeroCarteIdentite: e.target.value })} placeholder="Numéro de la carte" />
            </div>
            <div>
              <Label>N° Identification national</Label>
              <Input value={form.numeroIdentificationNational} onChange={(e) => setForm({ ...form, numeroIdentificationNational: e.target.value })} placeholder="NIN" />
            </div>
            <div>
              <Label>Date de délivrance de la carte</Label>
              <Input type="date" value={form.dateDelivranceCarteIdentite} onChange={(e) => setForm({ ...form, dateDelivranceCarteIdentite: e.target.value })} />
            </div>
            <div>
              <Label>Autorité de délivrance</Label>
              <Input value={form.autoriteDelivranceCarteIdentite} onChange={(e) => setForm({ ...form, autoriteDelivranceCarteIdentite: e.target.value })} placeholder="Autorité émettrice" />
            </div>

            <div>
              <Label>Wilaya</Label>
              <Input value={form.wilaya} disabled className="bg-slate-50" />
            </div>
            <div>
              <Label>Commune</Label>
              <Select value={form.commune} onValueChange={handleCommuneChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une commune" />
                </SelectTrigger>
                <SelectContent>
                  {communesKhenchela.map((c) => (
                    <SelectItem key={c.commune} value={c.commune}>{c.commune}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Daïra</Label>
              <Input value={form.daïra} disabled className="bg-slate-50" placeholder="Automatique" />
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