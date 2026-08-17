import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function Parametres() {
  const { parametres, updateParametres } = useAppStore();
  const [form, setForm] = useState(parametres);

  const handleSave = () => {
    updateParametres(form);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">Configuration générale du bureau</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl font-bold text-slate-900">Informations du bureau</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nom du bureau</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif text-xl font-bold text-slate-900">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Devise</Label>
              <Input value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })} />
            </div>
            <div>
              <Label>Année courante</Label>
              <Input type="number" value={form.anneeCourante} onChange={(e) => setForm({ ...form, anneeCourante: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Chemin de stockage des documents</Label>
              <Input value={form.dossierRacine} onChange={(e) => setForm({ ...form, dossierRacine: e.target.value })} />
            </div>
            <div>
              <Label>Catégories techniques</Label>
              <div className="flex flex-wrap gap-2">
                {form.categoriesTechniques.map((cat, index) => (
                  <span key={index} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} className="bg-slate-900 text-white hover:bg-slate-800">
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}