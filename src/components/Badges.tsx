import type { DossierEtat, EcheanceStatut } from '@/types';

export function EtatBadge({ etat }: { etat: string }) {
  const colors: Record<string, string> = {
    NOUVEAU: 'bg-blue-100 text-blue-800 border-blue-300',
    'EN COURS': 'bg-amber-100 text-amber-800 border-amber-300',
    INCOMPLET: 'bg-red-100 text-red-800 border-red-300',
    'EN ATTENTE': 'bg-purple-100 text-purple-800 border-purple-300',
    TERMINÉ: 'bg-green-100 text-green-800 border-green-300',
    ANNULÉ: 'bg-gray-200 text-gray-600 border-gray-300',
  };
  const cls = colors[etat] || 'bg-gray-100 text-gray-700 border-gray-300';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
    >
      {etat}
    </span>
  );
}

export function EcheanceBadge({ statut }: { statut: EcheanceStatut }) {
  const colors: Record<string, string> = {
    'EN RETARD': 'bg-red-100 text-red-800 border-red-300',
    'ÉCHÉANCE PROCHE': 'bg-orange-100 text-orange-800 border-orange-300',
    'DANS LES DÉLAIS': 'bg-green-100 text-green-800 border-green-300',
    TERMINÉ: 'bg-green-100 text-green-800 border-green-300',
    '—': 'bg-gray-100 text-gray-500 border-gray-300',
  };
  const cls = colors[statut] || 'bg-gray-100 text-gray-500 border-gray-300';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
    >
      {statut}
    </span>
  );
}

export function DomaineBadge({ domaine }: { domaine: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {domaine}
    </span>
  );
}

export { DOSSIER_ETATS } from '@/types';
