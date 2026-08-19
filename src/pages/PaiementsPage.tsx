import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Wallet, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { DossierWithClient, Paiement, PaiementWithDossier, Client, ModePaiement } from '@/types';
import { MODES_PAIEMENT } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { Field, inputCls, selectCls, textareaCls } from '@/components/Field';
import { formatMontant, formatDate, todayISO, calculReste, calculPctPaiement } from '@/utils/helpers';

interface PaiementsPageProps {
  paiements: PaiementWithDossier[];
  dossiers: DossierWithClient[];
  clients: Client[];
  onOpenDossier: (id: string) => void;
  onCreatePaiement: (p: Omit<Paiement, 'id' | 'created_at'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface DossierPaiementRow {
  dossier: DossierWithClient;
  totalPaye: number;
  reste: number;
  pct: number;
}

function couleurEtatPaiement(pct: number): { bg: string; text: string; label: string } {
  if (pct >= 100) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Soldé' };
  if (pct >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partiel' };
  if (pct > 0) return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Entamé' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'Non payé' };
}

function couleurBarre(pct: number): string {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-500';
  if (pct > 0) return 'bg-orange-500';
  return 'bg-red-500';
}

export function PaiementsPage({
  paiements,
  dossiers,
  clients,
  onOpenDossier,
  onCreatePaiement,
  onDelete,
}: PaiementsPageProps) {
  const [query, setQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [versementDossier, setVersementDossier] = useState<DossierWithClient | null>(null);

  // Build dossier-level rows
  const rows: DossierPaiementRow[] = useMemo(() => {
    return dossiers
      .filter((d) => d.prix_total > 0)
      .map((d) => {
        const totalPaye = paiements
          .filter((p) => p.dossier_id === d.id)
          .reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
        const reste = calculReste(d.prix_total, totalPaye);
        const pct = calculPctPaiement(d.prix_total, totalPaye);
        return { dossier: d, totalPaye, reste, pct };
      })
      .sort((a, b) => a.pct - b.pct);
  }, [dossiers, paiements]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.dossier.numero,
        r.dossier.domaine,
        r.dossier.prestation,
        r.dossier.client?.nom ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  // Summary stats
  const caTotal = rows.reduce((s, r) => s + r.dossier.prix_total, 0);
  const totalEncaisse = rows.reduce((s, r) => s + r.totalPaye, 0);
  const totalRestant = rows.reduce((s, r) => s + r.reste, 0);
  const nbNonSoldes = rows.filter((r) => r.pct < 100).length;

  return (
    <div>
      <PageHeader title="Paiements" subtitle="Suivi des versements par dossier" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <Wallet size={20} className="text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Chiffre d'affaires</p>
              <p className="text-lg font-bold text-gray-800">{formatMontant(caTotal)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total encaissé</p>
              <p className="text-lg font-bold text-green-700">{formatMontant(totalEncaisse)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total restant</p>
              <p className="text-lg font-bold text-orange-700">{formatMontant(totalRestant)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Dossiers non soldés</p>
              <p className="text-lg font-bold text-red-700">{nbNonSoldes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par dossier, client, domaine..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-semibold">N° Dossier</th>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Domaine</th>
                <th className="px-4 py-3 text-left font-semibold">Prestation</th>
                <th className="px-4 py-3 text-right font-semibold">Montant total</th>
                <th className="px-4 py-3 text-right font-semibold">Total payé</th>
                <th className="px-4 py-3 text-right font-semibold">Reste</th>
                <th className="px-4 py-3 text-center font-semibold">État</th>
                <th className="px-4 py-3 text-center font-semibold">Versement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Aucun dossier
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const etat = couleurEtatPaiement(r.pct);
                return (
                  <tr key={r.dossier.id} className="hover:bg-sky-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenDossier(r.dossier.id)}
                        className="font-semibold text-sky-700 hover:underline"
                      >
                        {r.dossier.numero}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.dossier.client?.nom ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.dossier.domaine}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {r.dossier.prestation}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatMontant(r.dossier.prix_total)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatMontant(r.totalPaye)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-700">
                      {formatMontant(r.reste)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${etat.bg} ${etat.text}`}
                        >
                          {r.pct}% — {etat.label}
                        </span>
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${couleurBarre(r.pct)} transition-all`}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setVersementDossier(r.dossier)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-colors"
                      >
                        <Plus size={14} />
                        Versement
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Versement modal */}
      {versementDossier && (
        <VersementModal
          dossier={versementDossier}
          totalPaye={paiements
            .filter((p) => p.dossier_id === versementDossier.id)
            .reduce((s, p) => s + (Number(p.montant) || 0), 0)}
          onClose={() => setVersementDossier(null)}
          onSave={async (p) => {
            await onCreatePaiement(p);
            setVersementDossier(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        message="Voulez-vous réellement supprimer ce paiement ?"
        onConfirm={async () => {
          if (deleteId) {
            await onDelete(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );

  // Inline versement modal component
  function VersementModal({
    dossier,
    totalPaye,
    onClose,
    onSave,
  }: {
    dossier: DossierWithClient;
    totalPaye: number;
    onClose: () => void;
    onSave: (p: Omit<Paiement, 'id' | 'created_at'>) => Promise<void>;
  }) {
    const [date, setDate] = useState(todayISO());
    const [montant, setMontant] = useState('');
    const [modePaiement, setModePaiement] = useState<ModePaiement>('ESPÈCES');
    const [observation, setObservation] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const reste = calculReste(dossier.prix_total, totalPaye);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      const m = parseFloat(montant);
      if (isNaN(m) || m <= 0) {
        setError('Montant invalide');
        return;
      }
      setSaving(true);
      try {
        await onSave({
          dossier_id: dossier.id,
          date,
          montant: m,
          mode_paiement: modePaiement,
          reference: null,
          observation: observation || null,
        });
      } catch (err) {
        setError((err as Error).message);
        setSaving(false);
      }
    }

    return (
      <Modal open onClose={onClose} title={`Versement — ${dossier.numero}`} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Client:</span>
              <span className="font-medium text-gray-800">
                {dossier.client?.nom ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Montant total:</span>
              <span className="font-medium text-gray-800">
                {formatMontant(dossier.prix_total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Déjà payé:</span>
              <span className="font-medium text-green-700">
                {formatMontant(totalPaye)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reste à payer:</span>
              <span className="font-bold text-orange-700">
                {formatMontant(reste)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date" required>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Montant (DA)" required>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </Field>
            <Field label="Mode de paiement">
              <select
                className={selectCls}
                value={modePaiement}
                onChange={(e) =>
                  setModePaiement(e.target.value as ModePaiement)
                }
              >
                {MODES_PAIEMENT.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Observation">
            <textarea
              className={textareaCls}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Note optionnelle"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le versement'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }
}
