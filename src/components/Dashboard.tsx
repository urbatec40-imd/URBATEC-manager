import { useMemo } from "react";
import { FolderOpen, Loader2, CheckCircle2, AlertCircle, CalendarClock, Scale, WalletCards } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatMontant, joursRestants, getEtatBadge, getAvancementColor } from "@/lib/business-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function Dashboard() {
  const { dossiers, expertises, parametres } = useAppStore();

  const stats = useMemo(() => {
    const total = dossiers.length;
    const enCours = dossiers.filter((d) => d.etat === "EN COURS").length;
    const termines = dossiers.filter((d) => d.etat === "TERMINÉ").length;
    const incomplets = dossiers.filter((d) => d.etat === "INCOMPLET").length;
    const retard = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) < 0).length;
    const proches = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) >= 0 && joursRestants(d.dateLimite) <= 7).length;
    const totalAEncaisser = dossiers.reduce((sum, d) => sum + d.reste, 0);
    return { total, enCours, termines, incomplets, retard, proches, totalAEncaisser };
  }, [dossiers]);

  const prioritaires = useMemo(() => dossiers
    .filter((d) => d.etat !== "TERMINÉ" && d.etat !== "ANNULÉ")
    .sort((a, b) => joursRestants(a.dateLimite) - joursRestants(b.dateLimite))
    .slice(0, 7), [dossiers]);

  const kpis = [
    { label: "Total dossiers", value: stats.total, icon: FolderOpen, tone: "blue" },
    { label: "En cours", value: stats.enCours, icon: Loader2, tone: "amber" },
    { label: "Terminés", value: stats.termines, icon: CheckCircle2, tone: "green" },
    { label: "Incomplets", value: stats.incomplets, icon: AlertCircle, tone: "red" },
    { label: "En retard", value: stats.retard, icon: AlertCircle, tone: "red" },
    { label: "Échéances ≤ 7 jours", value: stats.proches, icon: CalendarClock, tone: "orange" },
    { label: "Expertises judiciaires", value: expertises.length, icon: Scale, tone: "violet" },
    { label: "Total à encaisser", value: formatMontant(stats.totalAEncaisser), icon: WalletCards, tone: "slate" },
  ] as const;

  const toneMap = {
    blue: "border-l-blue-500",
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    red: "border-l-red-500",
    orange: "border-l-orange-500",
    violet: "border-l-violet-500",
    slate: "border-l-slate-500",
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f4f6f9] p-5 md:p-7">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <div className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-600">Vue générale</div>
            <h1 className="text-[27px] font-extrabold tracking-[-0.04em] text-slate-950 md:text-[30px]">Tableau de bord</h1>
            <p className="mt-1 text-[12px] text-slate-500">Vue d'ensemble de l'activité du bureau d'études</p>
          </div>
          <div className="hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[10px] font-semibold text-slate-500 shadow-sm md:block">URATEC · Vue générale</div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className={`border-slate-200/80 border-l-4 ${toneMap[tone]} bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:-translate-y-0.5 hover:shadow-md`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</div>
                    <div className="mt-1.5 text-[22px] font-extrabold tracking-[-0.035em] text-slate-950">{value}</div>
                  </div>
                  <Icon className="mt-0.5 h-4 w-4 text-slate-300" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-[14px] font-bold tracking-tight text-slate-950">Dossiers prioritaires</h2>
                  <p className="mt-0.5 text-[10px] text-slate-400">Dossiers actifs triés par urgence d'échéance</p>
                </div>
                <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[9px] font-bold text-slate-500">{prioritaires.length} actifs</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-400">
                      <th className="px-5 py-3">N° Dossier</th><th className="px-3 py-3">Client</th><th className="px-3 py-3">Domaine</th><th className="px-3 py-3">Date limite</th><th className="px-3 py-3">Avancement</th><th className="px-3 py-3">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prioritaires.map((d) => {
                      const jours = joursRestants(d.dateLimite);
                      const badge = getEtatBadge(d.etat);
                      return (
                        <tr key={d.id} className="border-b border-slate-50 transition hover:bg-blue-50/30">
                          <td className="px-5 py-3.5"><div className="text-[11px] font-bold text-slate-900">{d.numero}</div><div className="mt-0.5 max-w-[210px] truncate text-[9px] text-slate-400">{d.prestation}</div></td>
                          <td className="px-3 py-3.5 text-[10px] font-semibold text-slate-600">{d.clientNom}</td>
                          <td className="px-3 py-3.5"><span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-600">{d.domaine}</span></td>
                          <td className="px-3 py-3.5"><div className="text-[10px] font-semibold text-slate-600">{d.dateLimite}</div><span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[8px] font-extrabold ${jours < 0 ? "bg-red-50 text-red-600" : jours <= 7 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{jours < 0 ? `${Math.abs(jours)}j retard` : `${jours}j restants`}</span></td>
                          <td className="px-3 py-3.5"><div className="flex min-w-[120px] items-center gap-2"><Progress value={d.avancement} className="w-[78px] bg-slate-100" indicatorClassName={getAvancementColor(d.avancement)} /><span className="text-[9px] font-extrabold text-slate-500">{d.avancement}%</span></div></td>
                          <td className="px-3 py-3.5"><Badge className={`${badge} rounded-md px-2 py-1 text-[8px] font-extrabold`}>{d.etat}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-slate-200/80 bg-[#0b1220] text-white shadow-[0_8px_30px_rgba(15,23,42,.12)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500"><Scale className="h-3.5 w-3.5 text-blue-400" /> Expertise judiciaire</div>
                <div className="mt-4 text-[28px] font-extrabold tracking-[-0.04em]">{expertises.length}</div>
                <div className="mt-1 text-[10px] text-slate-500">expertises enregistrées</div>
                <div className="mt-5 h-px bg-white/[0.08]" />
                <div className="mt-4 flex items-center justify-between"><span className="text-[9px] text-slate-500">Dossiers terminés</span><span className="text-[10px] font-bold text-slate-300">{stats.termines}</span></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between"><div><div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">À encaisser</div><div className="mt-2 text-[19px] font-extrabold tracking-tight text-slate-950">{formatMontant(stats.totalAEncaisser)}</div></div><WalletCards className="h-4 w-4 text-emerald-500" /></div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[68%] rounded-full bg-emerald-500" /></div>
                <div className="mt-2 flex justify-between text-[9px] font-semibold text-slate-400"><span>Situation actuelle</span><span>68%</span></div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-5 py-3.5">
          <div><div className="text-[10px] font-bold text-slate-700">{parametres.nom || "URATEC"}</div><div className="mt-0.5 text-[9px] text-slate-400">Bureau d'études · Topographie · Foncier · Architecture · Environnement · Laboratoire · Expertises judiciaires</div></div>
          <div className="hidden text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-300 md:block">URATEC MANAGER</div>
        </div>
      </div>
    </div>
  );
}
