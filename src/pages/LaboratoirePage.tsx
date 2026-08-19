import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, FlaskConical } from 'lucide-react';
import type { Laboratoire } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { Field, inputCls, textareaCls } from '@/components/Field';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDate, todayISO } from '@/utils/helpers';

interface LaboratoirePageProps {
  essais: Laboratoire[];
  onCreate: (l: Omit<Laboratoire, 'id' | 'created_at' | 'numero_essai'>) => Promise<void>;
  onUpdate: (id: string, l: Partial<Laboratoire>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function LaboratoirePage({
  essais,
  onCreate,
  onUpdate,
  onDelete,
}: LaboratoirePageProps) {
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Laboratoire | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return essais;
    return essais.filter((e) =>
      [e.numero_essai, e.chantier ?? '', e.type_essai ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [essais, query]);

  return (
    <div>
      <PageHeader
        title="Laboratoire"
        subtitle="Essais de compression du béton"
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nouvel essai
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
          placeholder="Rechercher: numéro, chantier, type..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-3 py-3 text-left font-semibold">N° Essai</th>
                <th className="px-3 py-3 text-left font-semibold">Chantier</th>
                <th className="px-3 py-3 text-left font-semibold">Type</th>
                <th className="px-3 py-3 text-left font-semibold">Date</th>
                <th className="px-3 py-3 text-left font-semibold">N° Éprouvette</th>
                <th className="px-3 py-3 text-center font-semibold">Âge (j)</th>
                <th className="px-3 py-3 text-center font-semibold">Poids (kg)</th>
                <th className="px-3 py-3 text-center font-semibold">Charge (kN)</th>
                <th className="px-3 py-3 text-center font-semibold">Résistance (bar)</th>
                <th className="px-3 py-3 text-left font-semibold">Résultat</th>
                <th className="px-3 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-gray-400">
                    Aucun essai
                  </td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-sky-50 transition-colors">
                  <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">
                    {e.numero_essai}
                  </td>
                  <td className="px-3 py-3 text-gray-700">{e.chantier ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600">{e.type_essai ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(e.date)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {e.numero_eprouvette ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600">
                    {e.age_jours ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600">
                    {e.poids_kg ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600">
                    {e.charge_kn ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-800">
                    {e.resistance_bar ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {e.resultat ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EssaiForm
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

function EssaiForm({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (l: Omit<Laboratoire, 'id' | 'created_at' | 'numero_essai'>) => Promise<void>;
  initial: Laboratoire | null;
}) {
  const [form, setForm] = useState({
    chantier: '',
    type_essai: 'Compression',
    date: todayISO(),
    numero_eprouvette: '',
    date_coulage: '',
    age_jours: '28',
    poids_kg: '',
    charge_kn: '',
    resistance_bar: '',
    resultat: '',
    observations: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (initial) {
      setForm({
        chantier: initial.chantier ?? '',
        type_essai: initial.type_essai ?? 'Compression',
        date: initial.date ? new Date(initial.date).toISOString().split('T')[0] : todayISO(),
        numero_eprouvette: initial.numero_eprouvette ?? '',
        date_coulage: initial.date_coulage
          ? new Date(initial.date_coulage).toISOString().split('T')[0]
          : '',
        age_jours: String(initial.age_jours ?? '28'),
        poids_kg: initial.poids_kg != null ? String(initial.poids_kg) : '',
        charge_kn: initial.charge_kn != null ? String(initial.charge_kn) : '',
        resistance_bar: initial.resistance_bar != null ? String(initial.resistance_bar) : '',
        resultat: initial.resultat ?? '',
        observations: initial.observations ?? '',
      });
    } else {
      setForm({
        chantier: '',
        type_essai: 'Compression',
        date: todayISO(),
        numero_eprouvette: '',
        date_coulage: '',
        age_jours: '28',
        poids_kg: '',
        charge_kn: '',
        resistance_bar: '',
        resultat: '',
        observations: '',
      });
    }
    setError('');
  }, [initial]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        chantier: form.chantier || null,
        type_essai: form.type_essai || null,
        date: form.date || null,
        numero_eprouvette: form.numero_eprouvette || null,
        date_coulage: form.date_coulage || null,
        age_jours: form.age_jours ? parseInt(form.age_jours, 10) : null,
        poids_kg: form.poids_kg ? parseFloat(form.poids_kg) : null,
        charge_kn: form.charge_kn ? parseFloat(form.charge_kn) : null,
        resistance_bar: form.resistance_bar ? parseFloat(form.resistance_bar) : null,
        resultat: form.resultat || null,
        observations: form.observations || null,
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
      title={initial ? 'Modifier l\'essai' : 'Nouvel essai de laboratoire'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Chantier">
            <input
              className={inputCls}
              value={form.chantier}
              onChange={(e) => setForm({ ...form, chantier: e.target.value })}
            />
          </Field>
          <Field label="Type d'essai">
            <input
              className={inputCls}
              value={form.type_essai}
              onChange={(e) => setForm({ ...form, type_essai: e.target.value })}
            />
          </Field>
          <Field label="Date de l'essai">
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="N° Éprouvette">
            <input
              className={inputCls}
              value={form.numero_eprouvette}
              onChange={(e) =>
                setForm({ ...form, numero_eprouvette: e.target.value })
              }
            />
          </Field>
          <Field label="Date de coulage">
            <input
              type="date"
              className={inputCls}
              value={form.date_coulage}
              onChange={(e) => setForm({ ...form, date_coulage: e.target.value })}
            />
          </Field>
          <Field label="Âge en jours">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.age_jours}
              onChange={(e) => setForm({ ...form, age_jours: e.target.value })}
            />
          </Field>
          <Field label="Poids (kg)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={form.poids_kg}
              onChange={(e) => setForm({ ...form, poids_kg: e.target.value })}
            />
          </Field>
          <Field label="Charge (kN)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={form.charge_kn}
              onChange={(e) => setForm({ ...form, charge_kn: e.target.value })}
            />
          </Field>
          <Field label="Résistance (bar)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={form.resistance_bar}
              onChange={(e) =>
                setForm({ ...form, resistance_bar: e.target.value })
              }
            />
          </Field>
          <Field label="Résultat">
            <input
              className={inputCls}
              value={form.resultat}
              onChange={(e) => setForm({ ...form, resultat: e.target.value })}
              placeholder="Ex: Conforme / Non conforme"
            />
          </Field>
        </div>
        <Field label="Observations">
          <textarea
            className={textareaCls}
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
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
