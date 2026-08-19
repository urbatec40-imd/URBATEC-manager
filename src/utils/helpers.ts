import type { EcheanceStatut } from '@/types';

// ===== FORMATAGE MONÉTAIRE =====
export function formatMontant(montant: number): string {
  const value = Number(montant) || 0;
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' DA';
}

export function formatNombre(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Number(n) || 0);
}

// ===== FORMATAGE DATES =====
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ===== CALCULS ÉCHÉANCES =====
export function joursRestants(dateLimite: string | null | undefined): number | null {
  if (!dateLimite) return null;
  const limite = new Date(dateLimite);
  if (isNaN(limite.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  const diff = limite.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function statutEcheance(
  dateLimite: string | null | undefined,
  etatDossier?: string
): EcheanceStatut {
  if (etatDossier === 'TERMINÉ') return 'TERMINÉ';
  if (etatDossier === 'ANNULÉ') return '—';
  if (!dateLimite) return '—';
  const jr = joursRestants(dateLimite);
  if (jr === null) return '—';
  if (jr < 0) return 'EN RETARD';
  if (jr <= 7) return 'ÉCHÉANCE PROCHE';
  return 'DANS LES DÉLAIS';
}

// ===== CALCULS FINANCIERS =====
export function calculReste(prixTotal: number, totalPaye: number): number {
  return (Number(prixTotal) || 0) - (Number(totalPaye) || 0);
}

export function calculPctPaiement(prixTotal: number, totalPaye: number): number {
  const total = Number(prixTotal) || 0;
  if (total === 0) return 0;
  const paye = Number(totalPaye) || 0;
  return Math.min(100, Math.round((paye / total) * 100));
}

// ===== COULEURS AVANCEMENT =====
export function couleurAvancement(avancement: number): string {
  const pct = Number(avancement) || 0;
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

export function couleurAvancementTexte(avancement: number): string {
  const pct = Number(avancement) || 0;
  if (pct >= 100) return 'text-green-700';
  if (pct >= 50) return 'text-orange-700';
  return 'text-red-700';
}

// ===== GÉNÉRATION NUMÉRO DOSSIER =====
export function prefixePourDomaine(domaine: string): string {
  const map: Record<string, string> = {
    'Foncier agricole': 'FA',
    Topographie: 'TOPO',
    Architecture: 'ARCH',
    Environnement: 'ENV',
    'Laboratoire géotechnique': 'LAB',
    'Expertise judiciaire': 'EXP',
  };
  return map[domaine] || 'DOSS';
}

export function genererNumeroDossier(
  prefixe: string,
  annee: number,
  index: number
): string {
  return `${prefixe}-${annee}-${String(index).padStart(3, '0')}`;
}

export function genererNumeroExpertise(annee: number, index: number): string {
  return `EXP-${annee}-${String(index).padStart(3, '0')}`;
}

export function genererNumeroEssai(annee: number, index: number): string {
  return `ESS-${annee}-${String(index).padStart(3, '0')}`;
}

// ===== TAILLE FICHIER =====
export function formatTaille(octets: number): string {
  const o = Number(octets) || 0;
  if (o < 1024) return `${o} o`;
  if (o < 1024 * 1024) return `${(o / 1024).toFixed(1)} Ko`;
  return `${(o / (1024 * 1024)).toFixed(1)} Mo`;
}
