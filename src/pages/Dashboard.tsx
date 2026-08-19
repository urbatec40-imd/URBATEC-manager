import { useMemo } from 'react';
import {
  FolderKanban,
  Loader,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Scale,
  Wallet,
} from 'lucide-react';
import type { DossierWithClient, Paiement } from '@/types';
import { StatCard } from '@/components/StatCard';
import { EtatBadge, EcheanceBadge, DomaineBadge } from '@/components/Badges';
import { ProgressBar } from '@/components/ProgressBar';
import {
  formatMontant,
  formatDate,
  joursRestants,
  statutEcheance,
  calculReste,
  calculPctPaiement,
} from '@/utils/helpers';

interface DashboardProps {
  dossiers: DossierWithClient[];
  paiements: Paiement[];
  onOpenDossier: (id: string) => void;
}

export function Dashboard({
  dossiers,
  paiements,
  onOpenDossier,
}: DashboardProps) {
  const stats = useMemo(() => {
    const totalDossiers = dossiers.length;
    const enCours = dossiers.filter((d) => d.etat === 'EN COURS').length;
    const termines = dossiers.filter((d) => d.etat === 'TERMINÉ').length;
    const incomplets = dossiers.filter((d) => d.etat === 'INCOMPLET').length;
    const enRetard = dossiers.filter((d) => {
      const st = statutEcheance(d.date_limite, d.etat);
      return st === 'EN RETARD';
    }).length;
    const echeancesProches = dossiers.filter((d) => {
      const st = statutEcheance(d.date_limite, d.etat);
      return st === 'ÉCHÉANCE PROCHE';
    }).length;
    const expertises = dossiers.filter(
      (d) => d.domaine === 'Expertise judiciaire'
    ).length;

    const totalEncaisser = dossiers.reduce(
      (sum, d) => sum + calculReste(d.prix_total, 0),
      0
    );
    const totalPaye = paiements.reduce(
      (sum, p) => sum + (Number(p.montant) || 0),
      0
    );
    const resteTotal = Math.max(0, totalEncaisser - totalPaye);

    return {
      totalDossiers,
      enCours,
      termines,
      incomplets,
      enRetard,
      echeancesProches,
      expertises,
      resteTotal,
    };
  }, [dossiers, paiements]);

  const prioritaires = useMemo(() => {
    return dossiers
      .filter((d) => d.etat !== 'TERMINÉ' && d.etat !== 'ANNULÉ')
      .map((d) => {
        const jr = joursRestants(d.date_limite);
        const paye = paiements
          .filter((p) => p.dossier_id === d.id)
          .reduce((s, p) => s + (Number(p.montant) || 0), 0);
        return { dossier: d, joursRest: jr, paye };
      })
      .sort((a, b) => {
        if (a.joursRest === null) return 1;
        if (b.joursRest === null) return -1;
        return a.joursRest - b.joursRest;
      })
      .slice(0, 8);
  }, [dossiers, paiements]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble de l'activité du bureau d'études
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total dossiers"
          value={stats.totalDossiers}
          color="blue"
          icon={<FolderKanban size={24} />}
        />
        <StatCard
          label="En cours"
          value={stats.enCours}
          color="amber"
          icon={<Loader size={24} />}
        />
        <StatCard
          label="Terminés"
          value={stats.termines}
          color="green"
          icon={<CheckCircle2 size={24} />}
        />
        <StatCard
          label="Incomplets"
          value={stats.incomplets}
          color="red"
          icon={<AlertCircle size={24} />}
        />
        <StatCard
          label="En retard"
          value={stats.enRetard}
          color="red"
          icon={<AlertCircle size={24} />}
        />
        <StatCard
          label="Échéances ≤ 7 jours"
          value={stats.echeancesProches}
          color="orange"
          icon={<CalendarClock size={24} />}
        />
        <StatCard
          label="Expertises judiciaires"
          value={stats.expertises}
          color="purple"
          icon={<Scale size={24} />}
        />
        <StatCard
          label="Total à encaisser"
          value={formatMontant(stats.resteTotal)}
          color="slate"
          icon={<Wallet size={24} />}
        />
      </div>

      {/* Tableau dossiers prioritaires */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Dossiers prioritaires</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Dossiers actifs triés par urgence d'échéance
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-semibold">N° Dossier</th>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Domaine</th>
                <th className="px-4 py-3 text-left font-semibold">Prestation</th>
                <th className="px-4 py-3 text-left font-semibold">Date limite</th>
                <th className="px-4 py-3 text-center font-semibold">Jours restants</th>
                <th className="px-4 py-3 text-left font-semibold min-w-[140px]">Avancement</th>
                <th className="px-4 py-3 text-center font-semibold">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prioritaires.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Aucun dossier prioritaire
                  </td>
                </tr>
              )}
              {prioritaires.map(({ dossier: d, joursRest }) => {
                const st = statutEcheance(d.date_limite, d.etat);
                const jrColor =
                  joursRest === null
                    ? 'text-gray-400'
                    : joursRest < 0
                      ? 'text-red-600 font-bold'
                      : joursRest <= 7
                        ? 'text-orange-600 font-semibold'
                        : 'text-green-600';
                return (
                  <tr
                    key={d.id}
                    onClick={() => onOpenDossier(d.id)}
                    className="hover:bg-sky-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {d.numero}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {d.client?.nom ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DomaineBadge domaine={d.domaine} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.prestation}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(d.date_limite)}
                    </td>
                    <td className={`px-4 py-3 text-center whitespace-nowrap ${jrColor}`}>
                      {joursRest === null ? '—' : `${joursRest} j`}
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar value={d.avancement} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <EtatBadge etat={d.etat} />
                        <EcheanceBadge statut={st} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
