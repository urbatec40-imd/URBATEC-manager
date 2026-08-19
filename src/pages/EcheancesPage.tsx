import { useMemo } from 'react';
import { CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DossierWithClient } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { EcheanceBadge, DomaineBadge } from '@/components/Badges';
import {
  formatDate,
  joursRestants,
  statutEcheance,
} from '@/utils/helpers';

interface EcheancesPageProps {
  dossiers: DossierWithClient[];
  onOpenDossier: (id: string) => void;
}

export function EcheancesPage({ dossiers, onOpenDossier }: EcheancesPageProps) {
  const echeances = useMemo(() => {
    return dossiers
      .filter((d) => d.etat !== 'ANNULÉ' && d.date_limite)
      .map((d) => ({
        dossier: d,
        jours: joursRestants(d.date_limite),
        statut: statutEcheance(d.date_limite, d.etat),
      }))
      .sort((a, b) => {
        if (a.jours === null) return 1;
        if (b.jours === null) return -1;
        return a.jours - b.jours;
      });
  }, [dossiers]);

  const enRetard = echeances.filter((e) => e.statut === 'EN RETARD').length;
  const proches = echeances.filter((e) => e.statut === 'ÉCHÉANCE PROCHE').length;
  const dansLesDelais = echeances.filter((e) => e.statut === 'DANS LES DÉLAIS').length;
  const termines = echeances.filter((e) => e.statut === 'TERMINÉ').length;

  return (
    <div>
      <PageHeader
        title="Échéances"
        subtitle="Suivi des dates limites des dossiers"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-red-500 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="text-xs font-medium text-gray-500 uppercase">En retard</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{enRetard}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-orange-500 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock size={18} className="text-orange-500" />
            <p className="text-xs font-medium text-gray-500 uppercase">≤ 7 jours</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{proches}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-green-500 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-xs font-medium text-gray-500 uppercase">Dans les délais</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{dansLesDelais}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-green-500 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-xs font-medium text-gray-500 uppercase">Terminés</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{termines}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-semibold">N° Dossier</th>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Domaine</th>
                <th className="px-4 py-3 text-left font-semibold">Date limite</th>
                <th className="px-4 py-3 text-center font-semibold">Jours restants</th>
                <th className="px-4 py-3 text-center font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {echeances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Aucune échéance
                  </td>
                </tr>
              )}
              {echeances.map(({ dossier: d, jours, statut }) => {
                const jrColor =
                  jours === null
                    ? 'text-gray-400'
                    : jours < 0
                      ? 'text-red-600 font-bold'
                      : jours <= 7
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
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(d.date_limite)}
                    </td>
                    <td className={`px-4 py-3 text-center whitespace-nowrap ${jrColor}`}>
                      {jours === null ? '—' : `${jours} j`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EcheanceBadge statut={statut} />
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
