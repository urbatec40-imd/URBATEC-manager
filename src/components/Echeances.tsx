import { useAppStore } from "@/lib/store";
import { formatDate, joursRestants, getEtatEcheance } from "@/lib/business-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function Echeances() {
  const { dossiers } = useAppStore();

  const dossiersAvecEcheance = dossiers
    .filter((d) => d.dateLimite)
    .map((d) => ({
      ...d,
      jours: joursRestants(d.dateLimite),
      echeance: getEtatEcheance(d.dateLimite, d.etat),
    }))
    .sort((a, b) => a.jours - b.jours);

  const enRetard = dossiersAvecEcheance.filter((d) => d.jours < 0);
  const proches = dossiersAvecEcheance.filter((d) => d.jours >= 0 && d.jours <= 7);
  const dansDelais = dossiersAvecEcheance.filter((d) => d.jours > 7);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-slate-900">Échéances</h1>
        <p className="mt-1 text-sm text-slate-500">Suivi des dates limites des dossiers</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-700">En retard</p>
            <p className="mt-1 text-2xl font-bold text-red-800">{enRetard.length}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-orange-700">Échéance ≤ 7 jours</p>
            <p className="mt-1 text-2xl font-bold text-orange-800">{proches.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-green-700">Dans les délais</p>
            <p className="mt-1 text-2xl font-bold text-green-800">{dansDelais.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">N° Dossier</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Prestation</th>
                  <th className="px-4 py-3">Date limite</th>
                  <th className="px-4 py-3">Jours restants</th>
                  <th className="px-4 py-3">Avancement</th>
                  <th className="px-4 py-3">État</th>
                </tr>
              </thead>
              <tbody>
                {dossiersAvecEcheance.map((dossier) => (
                  <tr key={dossier.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{dossier.numero}</td>
                    <td className="px-4 py-3 text-slate-600">{dossier.clientNom}</td>
                    <td className="px-4 py-3 text-slate-600">{dossier.prestation}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(dossier.dateLimite)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${dossier.jours < 0 ? "text-red-600" : dossier.jours <= 7 ? "text-orange-600" : "text-green-600"}`}>
                        {dossier.jours < 0 ? `${Math.abs(dossier.jours)}j retard` : `${dossier.jours}j`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={dossier.avancement} className="w-16" />
                        <span className="text-xs text-slate-600">{dossier.avancement}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={dossier.echeance.color}>{dossier.echeance.label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}