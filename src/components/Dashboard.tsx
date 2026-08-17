import { useAppStore } from "@/lib/store";
import { formatMontant, joursRestants, getEtatBadge, getAvancementColor } from "@/lib/business-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Clock, Scale, Wallet, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowUpRight, CalendarDays } from "lucide-react";

export function Dashboard() {
  const { dossiers, expertises, parametres } = useAppStore();
  const totalDossiers = dossiers.length;
  const enCours = dossiers.filter((d) => d.etat === "EN COURS").length;
  const termines = dossiers.filter((d) => d.etat === "TERMINÉ").length;
  const incomplets = dossiers.filter((d) => d.etat === "INCOMPLET").length;
  const enRetard = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) < 0).length;
  const echeancesProches = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) <= 7 && joursRestants(d.dateLimite) >= 0).length;
  const totalAEncaisser = dossiers.reduce((sum, d) => sum + d.reste, 0);
  const dossiersPrioritaires = dossiers.filter((d) => d.etat !== "TERMINÉ").sort((a, b) => joursRestants(a.dateLimite) - joursRestants(b.dateLimite)).slice(0, 8);

  const stats = [
    { label: "Dossiers", value: totalDossiers, icon: FolderOpen, tone: "slate" },
    { label: "En cours", value: enCours, icon: FileText, tone: "indigo" },
    { label: "Terminés", value: termines, icon: CheckCircle2, tone: "green" },
    { label: "Incomplets", value: incomplets, icon: AlertTriangle, tone: "amber" },
    { label: "En retard", value: enRetard, icon: XCircle, tone: "red" },
    { label: "Échéances ≤ 7 j", value: echeancesProches, icon: Clock, tone: "yellow" },
    { label: "Expertises", value: expertises.length, icon: Scale, tone: "violet" },
    { label: "À encaisser", value: formatMontant(totalAEncaisser), icon: Wallet, tone: "emerald" },
  ];

  const tone: Record<string, string> = { slate: "bg-slate-950 text-white", indigo: "bg-indigo-50 text-indigo-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600", yellow: "bg-yellow-50 text-yellow-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600" };

  return (
    <div className="dashboard-grid min-h-[calc(100vh-72px)] p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Activité du bureau</div>
            <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-950 md:text-4xl">Bonjour, bienvenue.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Une vue claire de vos dossiers, échéances, expertises et encaissements.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><CalendarDays className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-slate-600">Vue générale</span></div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {stats.map((stat) => { const Icon = stat.icon; return <Card key={stat.label} className="group border-slate-200/80 bg-white/95 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone[stat.tone]}`}><Icon className="h-4 w-4" /></div><ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" /></div><div className="mt-4 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{stat.label}</div><div className="mt-1 truncate text-xl font-extrabold tracking-tight text-slate-950">{stat.value}</div></CardContent></Card>; })}
        </div>

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-bold tracking-tight text-slate-950">Dossiers prioritaires</h2><p className="mt-0.5 text-xs text-slate-400">Les dossiers nécessitant le plus d'attention.</p></div><button className="text-xs font-bold text-slate-500 transition hover:text-slate-950">Voir tous les dossiers →</button></div>
          <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"><th className="px-5 py-3.5">Dossier</th><th className="px-4 py-3.5">Client</th><th className="px-4 py-3.5">Domaine</th><th className="px-4 py-3.5">Prestation</th><th className="px-4 py-3.5">Date limite</th><th className="px-4 py-3.5">Délai</th><th className="px-4 py-3.5">Avancement</th><th className="px-4 py-3.5">État</th></tr></thead>
                  <tbody>{dossiersPrioritaires.map((dossier) => { const jours = joursRestants(dossier.dateLimite); const etatBadge = getEtatBadge(dossier.etat); return <tr key={dossier.id} className="border-b border-slate-50 transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="font-bold text-slate-900">{dossier.numero}</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mission</div></td><td className="px-4 py-4 font-medium text-slate-600">{dossier.clientNom}</td><td className="px-4 py-4 text-slate-500">{dossier.domaine}</td><td className="max-w-[220px] px-4 py-4 text-slate-500"><div className="truncate">{dossier.prestation}</div></td><td className="px-4 py-4 font-medium text-slate-500">{dossier.dateLimite}</td><td className="px-4 py-4"><span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-bold ${jours < 0 ? "bg-red-50 text-red-600" : jours <= 7 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{jours < 0 ? `${Math.abs(jours)}j retard` : `${jours}j`}</span></td><td className="px-4 py-4"><div className="flex min-w-[120px] items-center gap-2"><Progress value={dossier.avancement} className="w-20 bg-slate-100" indicatorClassName={getAvancementColor(dossier.avancement)} /><span className="text-[11px] font-bold text-slate-500">{dossier.avancement}%</span></div></td><td className="px-4 py-4"><Badge className={`${etatBadge} rounded-lg px-2.5 py-1 text-[10px] font-bold`}>{dossier.etat}</Badge></td></tr>; })}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-5 py-4"><div><div className="text-xs font-bold text-slate-700">{parametres.nom || "URATEC"}</div><div className="mt-0.5 text-[10px] text-slate-400">Bureau d'études · Topographie · Foncier · Architecture · Environnement · Laboratoire · Expertises judiciaires</div></div><div className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 md:block">URATEC MANAGER</div></div>
      </div>
    </div>
  );
}