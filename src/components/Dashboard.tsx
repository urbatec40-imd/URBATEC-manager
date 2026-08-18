import { useAppStore } from "@/lib/store";
import { formatMontant, joursRestants, getEtatBadge, getAvancementColor } from "@/lib/business-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Clock3, Scale, Wallet, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, CalendarDays, ChevronRight, CircleDollarSign } from "lucide-react";

export function Dashboard() {
  const { dossiers, expertises, parametres } = useAppStore();
  const totalDossiers = dossiers.length;
  const enCours = dossiers.filter((d) => d.etat === "EN COURS").length;
  const termines = dossiers.filter((d) => d.etat === "TERMINÉ").length;
  const incomplets = dossiers.filter((d) => d.etat === "INCOMPLET").length;
  const enRetard = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) < 0).length;
  const echeancesProches = dossiers.filter((d) => d.etat !== "TERMINÉ" && joursRestants(d.dateLimite) <= 7 && joursRestants(d.dateLimite) >= 0).length;
  const totalAEncaisser = dossiers.reduce((sum, d) => sum + d.reste, 0);
  const dossiersPrioritaires = dossiers.filter((d) => d.etat !== "TERMINÉ").sort((a, b) => joursRestants(a.dateLimite) - joursRestants(b.dateLimite)).slice(0, 6);

  const kpis = [
    { label: "Dossiers actifs", value: totalDossiers, note: `${enCours} en cours`, icon: FolderOpen, iconBg: "bg-blue-50 text-blue-600" },
    { label: "À traiter", value: incomplets, note: `${echeancesProches} échéance(s) proche(s)`, icon: AlertTriangle, iconBg: "bg-amber-50 text-amber-600" },
    { label: "En retard", value: enRetard, note: enRetard ? "Attention requise" : "Aucun retard", icon: Clock3, iconBg: "bg-red-50 text-red-600" },
    { label: "À encaisser", value: formatMontant(totalAEncaisser), note: "Solde des dossiers", icon: CircleDollarSign, iconBg: "bg-emerald-50 text-emerald-600" },
  ];

  return <div className="min-h-[calc(100vh-68px)] p-5 md:p-8">
    <div className="mx-auto max-w-[1480px]">
      <section className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><div className="mb-2 flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-600"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Vue générale</div><h1 className="text-[30px] font-extrabold tracking-[-0.045em] text-slate-950 md:text-[34px]">Bonjour, bienvenue.</h1><p className="mt-1.5 text-[13px] text-slate-500">Les informations importantes de votre bureau, au même endroit.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm"><CalendarDays className="h-4 w-4 text-slate-400" /><span className="text-[10px] font-bold text-slate-600">Aujourd'hui</span><span className="text-[10px] text-slate-400">·</span><span className="text-[10px] font-medium text-slate-500">Vue générale</span></div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => { const Icon = item.icon; return <Card key={item.label} className="border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:-translate-y-0.5 hover:shadow-md"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}><Icon className="h-[18px] w-[18px]" /></div><ArrowUpRight className="h-4 w-4 text-slate-200" /></div><div className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">{item.label}</div><div className="mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-slate-950">{item.value}</div><div className="mt-1 text-[10px] font-medium text-slate-400">{item.note}</div></CardContent></Card>; })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]"><CardContent className="p-0"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-[14px] font-bold tracking-tight text-slate-950">Dossiers prioritaires</h2><p className="mt-0.5 text-[10px] text-slate-400">Les dossiers qui nécessitent votre attention.</p></div><button className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-950">Voir tous <ChevronRight className="h-3 w-3" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-sm"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400"><th className="px-5 py-3">Dossier</th><th className="px-3 py-3">Client</th><th className="px-3 py-3">Domaine</th><th className="px-3 py-3">Échéance</th><th className="px-3 py-3">Avancement</th><th className="px-3 py-3">État</th></tr></thead><tbody>{dossiersPrioritaires.map((dossier) => { const jours = joursRestants(dossier.dateLimite); const etatBadge = getEtatBadge(dossier.etat); return <tr key={dossier.id} className="border-b border-slate-50 transition hover:bg-slate-50/60"><td className="px-5 py-3.5"><div className="text-[11px] font-bold text-slate-900">{dossier.numero}</div><div className="mt-0.5 max-w-[180px] truncate text-[9px] text-slate-400">{dossier.prestation}</div></td><td className="px-3 py-3.5 text-[10px] font-semibold text-slate-600">{dossier.clientNom}</td><td className="px-3 py-3.5 text-[10px] text-slate-500">{dossier.domaine}</td><td className="px-3 py-3.5"><div className="text-[10px] font-semibold text-slate-600">{dossier.dateLimite}</div><span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[8px] font-extrabold ${jours < 0 ? "bg-red-50 text-red-600" : jours <= 7 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{jours < 0 ? `${Math.abs(jours)}j retard` : `${jours}j restants`}</span></td><td className="px-3 py-3.5"><div className="flex min-w-[115px] items-center gap-2"><Progress value={dossier.avancement} className="w-[72px] bg-slate-100" indicatorClassName={getAvancementColor(dossier.avancement)} /><span className="text-[9px] font-extrabold text-slate-500">{dossier.avancement}%</span></div></td><td className="px-3 py-3.5"><Badge className={`${etatBadge} rounded-md px-2 py-1 text-[8px] font-extrabold`}>{dossier.etat}</Badge></td></tr>; })}</tbody></table></div></CardContent></Card>

        <div className="space-y-5">
          <Card className="border-slate-200/80 bg-[#0b1220] text-white shadow-[0_8px_30px_rgba(15,23,42,.12)]"><CardContent className="p-5"><div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500"><Scale className="h-3.5 w-3.5 text-blue-400" /> Expertise</div><div className="mt-4 text-[27px] font-extrabold tracking-[-0.04em]">{expertises.length}</div><div className="mt-1 text-[10px] text-slate-500">expertises enregistrées</div><div className="mt-5 h-px bg-white/[0.08]" /><div className="mt-4 flex items-center justify-between"><span className="text-[9px] text-slate-500">Terminés</span><span className="text-[10px] font-bold text-slate-300">{termines} dossiers</span></div></CardContent></Card>
          <Card className="border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]"><CardContent className="p-5"><div className="flex items-center justify-between"><div><div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Encaissement</div><div className="mt-2 text-[18px] font-extrabold tracking-tight text-slate-950">{formatMontant(totalAEncaisser)}</div></div><Wallet className="h-4 w-4 text-emerald-500" /></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[68%] rounded-full bg-emerald-500" /></div><div className="mt-2 flex justify-between text-[9px] font-semibold text-slate-400"><span>Situation actuelle</span><span>68%</span></div></CardContent></Card>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-5 py-3.5"><div><div className="text-[10px] font-bold text-slate-700">{parametres.nom || "URATEC"}</div><div className="mt-0.5 text-[9px] text-slate-400">Bureau d'études · Topographie · Foncier · Architecture · Environnement · Laboratoire · Expertises judiciaires</div></div><div className="hidden text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-300 md:block">URATEC MANAGER</div></div>
    </div>
  </div>;
}
