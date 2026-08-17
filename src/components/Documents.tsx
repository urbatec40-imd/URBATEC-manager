import { useState } from "react";
import { Plus, Trash2, FolderOpen, FileText, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, getExtensionIcon } from "@/lib/business-utils";
import { selectFile, openDocument, openFolder, fileExists, isDesktopEnvironment } from "@/lib/fileSystemService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Document } from "@/lib/db";

const categories = [
  "01_PIECES_CLIENT",
  "02_RELEVES",
  "03_PLANS",
  "04_PHOTOS",
  "05_RAPPORTS",
  "06_DOCUMENTS_FINAUX",
];

const categoriesTechniques = [
  "PLANS AUTOCAD",
  "DONNÉES TOPOGRAPHIQUES",
  "DONNÉES GLOBAL MAPPER",
  "DONNÉES SIG",
  "POINTS TOPOGRAPHIQUES",
  "LEVÉS TOPOGRAPHIQUES",
  "CALCULS TOPOGRAPHIQUES",
  "ORTHOPHOTOS",
  "IMAGES AÉRIENNES",
  "PLANS",
  "CARTOGRAPHIE",
  "RAPPORTS TECHNIQUES"
];

export function Documents() {
  const { documents, dossiers, addDocument, deleteDocument } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("all");
  const [selectedFile, setSelectedFile] = useState<{ name: string; extension: string; size: number; path?: string } | null>(null);
  const [form, setForm] = useState({
    dossierId: "",
    nom: "",
    date: new Date().toISOString().split("T")[0],
    categorie: "01_PIECES_CLIENT",
    categorieTechnique: "PLANS AUTOCAD",
    observation: "",
  });

  const isDesktop = isDesktopEnvironment();

  const openNew = () => {
    setSelectedFile(null);
    setForm({
      dossierId: dossiers[0]?.id.toString() || "",
      nom: "",
      date: new Date().toISOString().split("T")[0],
      categorie: "01_PIECES_CLIENT",
      categorieTechnique: "PLANS AUTOCAD",
      observation: "",
    });
    setDialogOpen(true);
  };

  const handleFileSelect = async () => {
    const result = await selectFile();
    if (result.success && result.file) {
      setSelectedFile(result.file);
      setForm({
        ...form,
        nom: result.file.name,
      });
    } else {
      alert(result.error || "Erreur lors de la sélection du fichier");
    }
  };

  const handleSave = async () => {
    if (!form.dossierId) {
      alert("Le dossier est obligatoire.");
      return;
    }
    if (!form.nom) {
      alert("Le nom du document est obligatoire.");
      return;
    }

    const dossier = dossiers.find((d) => d.id === Number(form.dossierId));
    if (!dossier) {
      alert("Dossier introuvable.");
      return;
    }

    let cheminLocal = "";
    let statut = "ENREGISTRÉ";

    if (selectedFile?.path) {
      cheminLocal = selectedFile.path;
      const exists = await fileExists(cheminLocal);
      statut = exists.exists ? "DISPONIBLE" : "FICHIER INTROUVABLE";
    } else if (isDesktop) {
      statut = "CHEMIN NON DISPONIBLE";
    }

    const nouveau: Document = {
      id: Date.now(),
      dossierId: Number(form.dossierId),
      numeroDossier: dossier.numero,
      type: selectedFile?.extension || "PDF",
      nom: form.nom,
      date: form.date,
      categorie: form.categorie,
      observation: form.observation,
      extension: selectedFile?.extension || "PDF",
      taille: selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "-",
      cheminLocal,
      categorieTechnique: form.categorieTechnique,
      statut,
    };

    addDocument(nouveau);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete?.id) {
      deleteDocument(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const handleOpenDocument = async (doc: Document) => {
    if (!doc.cheminLocal) {
      alert("Le chemin du fichier n'est pas disponible.");
      return;
    }
    const result = await openDocument(doc.cheminLocal);
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleOpenFolder = async (doc: Document) => {
    if (!doc.cheminLocal) {
      alert("Le chemin du fichier n'est pas disponible.");
      return;
    }
    const folderPath = doc.cheminLocal.substring(0, doc.cheminLocal.lastIndexOf("\\"));
    const result = await openFolder(folderPath);
    if (!result.success) {
      alert(result.error);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.nom.toLowerCase().includes(search.toLowerCase()) ||
      doc.numeroDossier.toLowerCase().includes(search.toLowerCase()) ||
      doc.type.toLowerCase().includes(search.toLowerCase());
    const matchesCategorie = filterCategorie === "all" || doc.categorie === filterCategorie;
    return matchesSearch && matchesCategorie;
  });

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "DISPONIBLE":
        return <Badge className="bg-green-100 text-green-800">🟢 DISPONIBLE</Badge>;
      case "CHEMIN NON DISPONIBLE":
        return <Badge className="bg-orange-100 text-orange-800">🟠 CHEMIN NON DISPONIBLE</Badge>;
      case "FICHIER INTROUVABLE":
        return <Badge className="bg-red-100 text-red-800">🔴 FICHIER INTROUVABLE</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800">ENREGISTRÉ</Badge>;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestion documentaire {isDesktop ? "— Accès complet aux fichiers" : "— Version Web"}
          </p>
        </div>
        <Button onClick={openNew} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" /> Ajouter un document
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher un document..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCategorie} onValueChange={setFilterCategorie}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
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
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Nom du document</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Catégorie technique</th>
                  <th className="px-4 py-3">Chemin</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{doc.numeroDossier}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg">{getExtensionIcon(doc.extension)}</span>
                      <span className="ml-1 text-xs text-slate-500">{doc.extension}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{doc.nom}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(doc.date)}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.categorie}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.categorieTechnique}</td>
                    <td className="px-4 py-3">
                      {doc.cheminLocal ? (
                        <span className="text-xs text-slate-500">{doc.cheminLocal}</span>
                      ) : (
                        <span className="text-xs text-orange-500">Non disponible</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatutBadge(doc.statut || "ENREGISTRÉ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ouvrir le fichier"
                          onClick={() => handleOpenDocument(doc)}
                          disabled={!doc.cheminLocal}
                        >
                          <FileText className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ouvrir l'emplacement"
                          onClick={() => handleOpenFolder(doc)}
                          disabled={!doc.cheminLocal}
                        >
                          <FolderOpen className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(doc)}>
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
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Dossier</Label>
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
            <div className="col-span-2">
              <Label>Fichier</Label>
              <div className="flex gap-2">
                <Input
                  value={selectedFile?.name || form.nom}
                  placeholder="Sélectionner un fichier"
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleFileSelect}>
                  <FolderOpen className="mr-2 h-4 w-4" /> Parcourir
                </Button>
              </div>
              {selectedFile && (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedFile.name} ({selectedFile.extension}, {(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div>
              <Label>Nom du document</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie technique</Label>
              <Select value={form.categorieTechnique} onValueChange={(v) => setForm({ ...form, categorieTechnique: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriesTechniques.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observation</Label>
              <Textarea value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">
              Enregistrer
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