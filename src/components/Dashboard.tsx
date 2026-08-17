import { useAppStore } from "@/lib/store";
import { formatMontant, joursRestants, getEtatBadge, getAvancementColor } from "@/lib/business-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Clock, Scale, Wallet, AlertTriangle, CheckCircle2, XCircle, FileText } from "lucide-react";

export function Dashboard() {
  const { dossiers, expertises, parametres } = useAppStore();

  const totalDossiers = dossiers.length;
  const enCours = dossiers.filter((d) => d.etat === "EN COURS").length;
  const termines = dossiers.filter((d) => d.etat === "TERMINÉ").length;
  const incomplets = dossiers.filter((d) => d.etat === "INCOMPLET").length;
  const enRetard = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) < 0).length;
  const echeancesProches = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) <= 7 && joursRestants(d.dateLimite) >= 0).length;
  const totalAEncaisser = dossiers.reduce((sum, d) => sum + d.reste, 0);

  const dossiersPrioritaires = dossiers
    .filter((d) => d.etat !== "TERMINÉ")
    .sort((a, b) => {
      const joursA = joursRestants(a.dateLimite);
      const joursB = joursRestants(b.dateLimite);
      return joursA - joursB;
    })
    .slice(0, 8);

  const stats = [
    { label: "TOTAL DOSSIERS", value: totalDossiers, icon: FolderOpen, color: "bg-slate-900 text-white" },
    { label: "EN COURS", value: enCours, icon: FileText, color: "bg-indigo-100 text-indigo-700" },
    { label: "TERMINÉS", value: termines, icon: CheckCircle2, color: "bg-green-100 text-green-700" },
    { label: "INCOMPLETS", value: incomplets, icon: AlertTriangle, color: "bg-orange-100 text-orange-700" },
    { label: "EN RETARD", value: enRetard, icon: XCircle, color: "bg-red-100 text-red-700" },
    { label: "ÉCHÉANCES ≤ 7 J", value: echeancesProches, icon: Clock, color: "bg-yellow-100 text-yellow-700" },
    { label: "EXPERTISES", value: expertises.length, icon: Scale, color: "bg-purple-100 text-purple-700" },
    { label: "À ENCAISSER", value: formatMontant(totalAEncaisser), icon: Wallet, color: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">
          {parametres.nom} • BUREAU D'ÉTUDES • TOPOGRAPHIE • FONCIER • ARCHITECTURE • ENVIRONNEMENT • LABORATOIRE • EXPERTISES JUDICIAIRES
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-serif text-2xl font-bold text-slate-900">Dossiers prioritaires</h2>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">N° Dossier</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Domaine</th>
                    <th className="px-4 py-3">Prestation</th>
                    <th className="px-4 py-3">Date limite</th>
                    <th className="px-4 py-3">Jours restants</th>
                    <th className="px-4 py-3">Avancement</th>
                    <th className="px-4 py-3">État</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiersPrioritaires.map((dossier) => {
                    const jours = joursRestants(dossier.dateLimite);
                    const etatEcheance = getEtatBadge(dossier.etat);
                    return (
                      <tr key={dossier.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{dossier.numero}</td>
                        <td className="px-4 py-3 text-slate-600">{dossier.clientNom}</td>
                        <td className="px-4 py-3 text-slate-600">{dossier.domaine}</td>
                        <td className="px-4 py-3 text-slate-600">{dossier.prestation}</td>
                        <td className="px-4 py-3 text-slate-600">{dossier.dateLimite}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${jours < 0 ? "text-red-600" : jours <= 7 ? "text-orange-600" : "text-green-600"}`}>
                            {jours < 0 ? `${Math.abs(jours)}j retard` : `${jours}j`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={dossier.avancement} className="w-16" indicatorClassName={getAvancementColor(dossier.avancement)} />
                            <span className="text-xs text-slate-600">{dossier.avancement}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={etatEcheance}>{dossier.etat}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}