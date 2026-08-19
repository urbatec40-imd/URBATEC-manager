import { useState, useMemo } from 'react';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Client, Dossier, DossierWithClient } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { EtatBadge, EcheanceBadge, DomaineBadge } from '@/components/Badges';
import { ProgressBar } from '@/components/ProgressBar';
import { DossierForm } from '@/components/DossierForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  formatMontant,
  formatDate,
  joursRestants,
  statutEcheance,
  calculReste,
} from '@/utils/helpers';
import { DOMAINES } from '@/types';

interface DossiersPageProps {
  dossiers: DossierWithClient[];
  clients: Client[];
  onOpenDossier: (id: string) => void;
  onCreate: (d: Omit<Dossier, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  onUpdate: (
    id: string,
    d: Partial<Dossier>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DossiersPage({
  dossiers,
  clients,
  onOpenDossier,
  onCreate,
  onUpdate,
  onDelete,
}: DossiersPageProps) {
  const [query, setQuery] = useState('');
  const [filtreDomaine, setFiltreDomaine] = useState('');
  const [filtreEtat, setFiltreEtat] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dossier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dossiers.filter((d) => {
      if (filtreDomaine && d.domaine !== filtreDomaine) return false;
      if (filtreEtat && d.etat !== filtreEtat) return false;
      if (!q) return true;
      const fields = [
        d.numero,
        d.client?.nom ?? '',
        d.telephone ?? '',
        d.reference ?? '',
        d.domaine,
        d.prestation,
      ];
      return fields.some((f) => f.toLowerCase().includes(q));
    });
  }, [dossiers, query, filtreDomaine, filtreEtat]);

  function handleNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(d: Dossier) {
    setEditing(d);
    setFormOpen(true);
  }

  async function handleSave(data: Omit<Dossier, 'id' | 'created_at' | 'numero'>) {
    if (editing) {
      await onUpdate(editing.id, data);
    } else {
      await onCreate(data);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await onDelete(deleteId);
    setDeleteId(null);
  }

  return (
    <div>
      <PageHeader
        title="Dossiers"
        subtitle={`${dossiers.length} dossier(s) au total`}
        actions={
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nouveau dossier
          </button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher: numéro, client, téléphone, référence..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        <select
          value={filtreDomaine}
          onChange={(e) => setFiltreDomaine(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Tous les domaines</option>
          {DOMAINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={filtreEtat}
          onChange={(e) => setFiltreEtat(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Tous les états</option>
          {['NOUVEAU', 'EN COURS', 'INCOMPLET', 'EN ATTENTE', 'TERMINÉ', 'ANNULÉ'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            )
          )}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-3 py-3 text-left font-semibold">N° Dossier</th>
                <th className="px-3 py-3 text-left font-semibold">Client</th>
                <th className="px-3 py-3 text-left font-semibold">Domaine</th>
                <th className="px-3 py-3 text-left font-semibold">Prestation</th>
                <th className="px-3 py-3 text-left font-semibold">Date limite</th>
                <th className="px-3 py-3 text-center font-semibold">Jours</th>
                <th className="px-3 py-3 text-left font-semibold min-w-[120px]">Avancement</th>
                <th className="px-3 py-3 text-center font-semibold">État</th>
                <th className="px-3 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                    Aucun dossier trouvé
                  </td>
                </tr>
              )}
              {filtered.map((d) => {
                const jr = joursRestants(d.date_limite);
                const st = statutEcheance(d.date_limite, d.etat);
                const jrColor =
                  jr === null
                    ? 'text-gray-400'
                    : jr < 0
                      ? 'text-red-600 font-bold'
                      : jr <= 7
                        ? 'text-orange-600 font-semibold'
                        : 'text-green-600';
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-sky-50 transition-colors"
                  >
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {d.numero}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {d.client?.nom ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <DomaineBadge domaine={d.domaine} />
                    </td>
                    <td className="px-3 py-3 text-gray-600">{d.prestation}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(d.date_limite)}
                    </td>
                    <td className={`px-3 py-3 text-center whitespace-nowrap ${jrColor}`}>
                      {jr === null ? '—' : `${jr} j`}
                    </td>
                    <td className="px-3 py-3">
                      <ProgressBar value={d.avancement} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <EtatBadge etat={d.etat} />
                        <EcheanceBadge statut={st} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenDossier(d.id)}
                          className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(d)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(d.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DossierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        clients={clients}
        initial={editing}
      />

      <ConfirmDialog
        open={!!deleteId}
        message="Voulez-vous réellement supprimer cet élément ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
