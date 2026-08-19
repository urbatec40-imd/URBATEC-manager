import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import type { Expertise, ExpertiseWithDossier } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { Field, inputCls, selectCls, textareaCls } from '@/components/Field';
import { EtatBadge } from '@/components/Badges';
import { ProgressBar } from '@/components/ProgressBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDate, joursRestants, todayISO } from '@/utils/helpers';
import { JURIDICTIONS } from '@/types';

interface ExpertisesPageProps {
  expertises: ExpertiseWithDossier[];
  onOpenDossier: (id: string) => void;
  onCreate: (e: Omit<Expertise, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  onUpdate: (id: string, e: Partial<Expertise>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ExpertisesPage({
  expertises,
  onOpenDossier,
  onCreate,
  onUpdate,
  onDelete,
}: ExpertisesPageProps) {
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expertise | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expertises;
    return expertises.filter((e) =>
      [
        e.numero,
        e.partie_demandeur ?? '',
        e.juridiction ?? '',
        e.nature_mission ?? '',
        e.dossier?.numero ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [expertises, query]);

  return (
    <div>
      <PageHeader
        title="Expertises judiciaires"
        subtitle={`${expertises.length} expertise(s)`}
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nouvelle expertise
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher: numéro, demandeur, juridiction..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-3 py-3 text-left font-semibold">N° Expertise</th>
                <th className="px-3 py-3 text-left font-semibold">Demandeur</th>
                <th className="px-3 py-3 text-left font-semibold">Juridiction</th>
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
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                    Aucune expertise
                  </td>
                </tr>
              )}
              {filtered.map((e) => {
                const jr = joursRestants(e.date_limite);
                const jrColor =
                  jr === null
                    ? 'text-gray-400'
                    : jr < 0
                      ? 'text-red-600 font-bold'
                      : jr <= 7
                        ? 'text-orange-600 font-semibold'
                        : 'text-green-600';
                return (
                  <tr key={e.id} className="hover:bg-sky-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {e.numero}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {e.partie_demandeur ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {e.juridiction ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(e.date_limite)}
                    </td>
                    <td className={`px-3 py-3 text-center whitespace-nowrap ${jrColor}`}>
                      {jr === null ? '—' : `${jr} j`}
                    </td>
                    <td className="px-3 py-3">
                      <ProgressBar value={e.avancement} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <EtatBadge etat={e.etat} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {e.dossier && (
                          <button
                            onClick={() => onOpenDossier(e.dossier!.id)}
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                            title="Voir dossier lié"
                          >
                            <Search size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(e);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={15} />
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

      <ExpertiseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={async (data) => {
          if (editing) await onUpdate(editing.id, data);
          else await onCreate(data);
          setFormOpen(false);
        }}
        initial={editing}
      />

      <ConfirmDialog
        open={!!deleteId}
        message="Voulez-vous réellement supprimer cet élément ?"
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
}

function ExpertiseFormModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: Omit<Expertise, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  initial: Expertise | null;
}) {
  const [form, setForm] = useState({
    partie_demandeur: '',
    date_reception: todayISO(),
    delai_accorde: '',
    date_limite: '',
    juridiction: '',
    nature_mission: '',
    avancement: '0',
    etat: 'NOUVEAU',
    observations: '',
    date_depot_rapport: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (initial) {
      setForm({
        partie_demandeur: initial.partie_demandeur ?? '',
        date_reception: initial.date_reception
          ? new Date(initial.date_reception).toISOString().split('T')[0]
          : todayISO(),
        delai_accorde: initial.delai_accorde ?? '',
        date_limite: initial.date_limite
          ? new Date(initial.date_limite).toISOString().split('T')[0]
          : '',
        juridiction: initial.juridiction ?? '',
        nature_mission: initial.nature_mission ?? '',
        avancement: String(initial.avancement ?? '0'),
        etat: initial.etat ?? 'NOUVEAU',
        observations: initial.observations ?? '',
        date_depot_rapport: initial.date_depot_rapport
          ? new Date(initial.date_depot_rapport).toISOString().split('T')[0]
          : '',
      });
    } else {
      setForm({
        partie_demandeur: '',
        date_reception: todayISO(),
        delai_accorde: '',
        date_limite: '',
        juridiction: '',
        nature_mission: '',
        avancement: '0',
        etat: 'NOUVEAU',
        observations: '',
        date_depot_rapport: '',
      });
    }
    setError('');
  }, [initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        partie_demandeur: form.partie_demandeur || null,
        date_reception: form.date_reception || null,
        delai_accorde: form.delai_accorde || null,
        date_limite: form.date_limite || null,
        juridiction: form.juridiction || null,
        nature_mission: form.nature_mission || null,
        avancement: parseInt(form.avancement, 10) || 0,
        etat: form.etat,
        observations: form.observations || null,
        date_depot_rapport: form.date_depot_rapport || null,
        dossier_id: null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier l\'expertise' : 'Nouvelle expertise judiciaire'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Partie / Demandeur">
            <input
              className={inputCls}
              value={form.partie_demandeur}
              onChange={(e) =>
                setForm({ ...form, partie_demandeur: e.target.value })
              }
            />
          </Field>
          <Field label="Date de réception">
            <input
              type="date"
              className={inputCls}
              value={form.date_reception}
              onChange={(e) =>
                setForm({ ...form, date_reception: e.target.value })
              }
            />
          </Field>
          <Field label="Délai accordé">
            <input
              className={inputCls}
              value={form.delai_accorde}
              onChange={(e) =>
                setForm({ ...form, delai_accorde: e.target.value })
              }
              placeholder="Ex: 30 jours"
            />
          </Field>
          <Field label="Date limite">
            <input
              type="date"
              className={inputCls}
              value={form.date_limite}
              onChange={(e) => setForm({ ...form, date_limite: e.target.value })}
            />
          </Field>
          <Field label="Juridiction / Autorité">
            <select
              className={selectCls}
              value={form.juridiction}
              onChange={(e) =>
                setForm({ ...form, juridiction: e.target.value })
              }
            >
              <option value="">— Sélectionner —</option>
              {JURIDICTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nature / Mission">
            <input
              className={inputCls}
              value={form.nature_mission}
              onChange={(e) =>
                setForm({ ...form, nature_mission: e.target.value })
              }
            />
          </Field>
          <Field label="Avancement (%)">
            <input
              type="number"
              min="0"
              max="100"
              className={inputCls}
              value={form.avancement}
              onChange={(e) =>
                setForm({ ...form, avancement: e.target.value })
              }
            />
          </Field>
          <Field label="État">
            <select
              className={selectCls}
              value={form.etat}
              onChange={(e) => setForm({ ...form, etat: e.target.value })}
            >
              {['NOUVEAU', 'EN COURS', 'INCOMPLET', 'EN ATTENTE', 'TERMINÉ', 'ANNULÉ'].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
          </Field>
          <Field label="Date de dépôt du rapport">
            <input
              type="date"
              className={inputCls}
              value={form.date_depot_rapport}
              onChange={(e) =>
                setForm({ ...form, date_depot_rapport: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Observations">
          <textarea
            className={textareaCls}
            value={form.observations}
            onChange={(e) =>
              setForm({ ...form, observations: e.target.value })
            }
          />
        </Field>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
        )}
        <div className="flex justify-end gap-3">
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
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
