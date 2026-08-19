import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  Eye,
} from 'lucide-react';
import type { Client, Dossier, DossierWithClient, Paiement } from '@/types';
import {
  COMMUNES_KHENCHELA,
  dairaPourCommune,
} from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { Field, inputCls, selectCls, textareaCls } from '@/components/Field';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DossierForm } from '@/components/DossierForm';
import { EtatBadge, DomaineBadge } from '@/components/Badges';
import { ProgressBar } from '@/components/ProgressBar';
import { formatMontant, formatDate, calculReste } from '@/utils/helpers';

interface ClientsPageProps {
  clients: Client[];
  dossiers: DossierWithClient[];
  paiements: Paiement[];
  onOpenDossier: (id: string) => void;
  onCreate: (c: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
  onUpdate: (id: string, c: Partial<Client>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateDossier: (d: Omit<Dossier, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  onUpdateDossier: (id: string, d: Partial<Dossier>) => Promise<void>;
  onDeleteDossier: (id: string) => Promise<void>;
}

export function ClientsPage({
  clients,
  dossiers,
  paiements,
  onOpenDossier,
  onCreate,
  onUpdate,
  onDelete,
  onCreateDossier,
  onUpdateDossier,
  onDeleteDossier,
}: ClientsPageProps) {
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.nom, c.telephone ?? '', c.email ?? '', c.nif_rc ?? '', c.commune ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [clients, query]);

  function statsForClient(clientId: string) {
    const clientDossiers = dossiers.filter((d) => d.client_id === clientId);
    const totalFacture = clientDossiers.reduce(
      (s, d) => s + (Number(d.prix_total) || 0),
      0
    );
    const totalPaye = paiements
      .filter((p) => clientDossiers.some((d) => d.id === p.dossier_id))
      .reduce((s, p) => s + (Number(p.montant) || 0), 0);
    return {
      nbDossiers: clientDossiers.length,
      totalFacture,
      totalPaye,
      reste: calculReste(totalFacture, totalPaye),
      dossiers: clientDossiers,
    };
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client(s)`}
        actions={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nouveau client
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
          placeholder="Rechercher un client..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8 col-span-full">
            Aucun client trouvé
          </p>
        )}
        {filtered.map((c) => {
          const stats = statsForClient(c.id);
          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                    <Users size={18} className="text-sky-600" />
                  </div>
                  <div>
                    <h3
                      className="font-bold text-gray-800 cursor-pointer hover:text-sky-600 transition-colors"
                      onClick={() => setSelectedClient(c)}
                    >
                      {c.nom}
                    </h3>
                    {c.nif_rc && (
                      <p className="text-xs text-gray-400">NIF/RC: {c.nif_rc}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setFormOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                {c.telephone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    {c.telephone}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    {c.email}
                  </div>
                )}
                {c.adresse && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{c.adresse}</span>
                  </div>
                )}
                {c.commune && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">
                      {c.commune}
                      {c.daira ? ` — ${c.daira}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <p className="text-gray-400">Dossiers</p>
                  <p className="font-bold text-gray-800">{stats.nbDossiers}</p>
                </div>
                <div>
                  <p className="text-gray-400">Facturé</p>
                  <p className="font-bold text-gray-800">{formatMontant(stats.totalFacture)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Payé</p>
                  <p className="font-bold text-green-600">{formatMontant(stats.totalPaye)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Reste</p>
                  <p className="font-bold text-red-600">{formatMontant(stats.reste)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Client detail modal with dossier management */}
      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          dossiers={statsForClient(selectedClient.id).dossiers}
          allClients={clients}
          onClose={() => setSelectedClient(null)}
          onOpenDossier={onOpenDossier}
          onCreateDossier={onCreateDossier}
          onUpdateDossier={onUpdateDossier}
          onDeleteDossier={onDeleteDossier}
        />
      )}

      <ClientForm
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

function ClientDetail({
  client,
  dossiers,
  allClients,
  onClose,
  onOpenDossier,
  onCreateDossier,
  onUpdateDossier,
  onDeleteDossier,
}: {
  client: Client;
  dossiers: DossierWithClient[];
  allClients: Client[];
  onClose: () => void;
  onOpenDossier: (id: string) => void;
  onCreateDossier: (d: Omit<Dossier, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  onUpdateDossier: (id: string, d: Partial<Dossier>) => Promise<void>;
  onDeleteDossier: (id: string) => Promise<void>;
}) {
  const [dossierFormOpen, setDossierFormOpen] = useState(false);
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  const [deleteDossierId, setDeleteDossierId] = useState<string | null>(null);

  return (
    <Modal open={true} onClose={onClose} title={client.nom} size="lg">
      <div className="space-y-5">
        {/* Coordonnées */}
        <div>
          <h4 className="font-bold text-gray-700 mb-2 text-sm">Coordonnées</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {client.telephone && (
              <div>
                <p className="text-xs font-semibold text-gray-500">Téléphone</p>
                <p className="text-gray-800">{client.telephone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-xs font-semibold text-gray-500">Email</p>
                <p className="text-gray-800">{client.email}</p>
              </div>
            )}
            {client.adresse && (
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-500">Adresse</p>
                <p className="text-gray-800">{client.adresse}</p>
              </div>
            )}
            {client.nif_rc && (
              <div>
                <p className="text-xs font-semibold text-gray-500">NIF / RC</p>
                <p className="text-gray-800">{client.nif_rc}</p>
              </div>
            )}
          </div>
        </div>

        {/* Localisation */}
        <div>
          <h4 className="font-bold text-gray-700 mb-2 text-sm">Localisation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-sky-50 rounded-lg p-3">
            <div>
              <p className="text-xs font-semibold text-gray-500">Wilaya</p>
              <p className="text-gray-800">{client.wilaya ?? 'Khenchela'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Daïra</p>
              <p className="text-gray-800">{client.daira || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Commune</p>
              <p className="text-gray-800">{client.commune || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Section</p>
              <p className="text-gray-800">{client.section || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">Îlot</p>
              <p className="text-gray-800">{client.ilot || '—'}</p>
            </div>
          </div>
        </div>

        {/* Dossiers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <FolderKanban size={16} className="text-sky-600" />
              Dossiers ({dossiers.length})
            </h4>
            <button
              onClick={() => {
                setEditingDossier(null);
                setDossierFormOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-colors"
            >
              <Plus size={14} />
              Nouveau dossier
            </button>
          </div>
          {dossiers.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun dossier</p>
          ) : (
            <div className="space-y-2">
              {dossiers.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-sky-50 transition-colors"
                >
                  <button
                    onClick={() => {
                      onClose();
                      onOpenDossier(d.id);
                    }}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <Eye size={15} className="text-sky-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{d.numero}</p>
                      <p className="text-xs text-gray-500">{d.prestation}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      <DomaineBadge domaine={d.domaine} />
                      <EtatBadge etat={d.etat} />
                    </div>
                    <div className="w-20 hidden md:block flex-shrink-0">
                      <ProgressBar value={d.avancement} />
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setEditingDossier(d);
                      setDossierFormOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors flex-shrink-0"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteDossierId(d.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {client.observations && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Observations</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {client.observations}
            </p>
          </div>
        )}
      </div>

      <DossierForm
        open={dossierFormOpen}
        onClose={() => setDossierFormOpen(false)}
        onSave={async (d) => {
          if (editingDossier) {
            await onUpdateDossier(editingDossier.id, d);
          } else {
            await onCreateDossier({ ...d, client_id: client.id });
          }
          setDossierFormOpen(false);
        }}
        clients={allClients}
        initial={editingDossier}
      />

      <ConfirmDialog
        open={!!deleteDossierId}
        message="Voulez-vous réellement supprimer ce dossier ?"
        onConfirm={async () => {
          if (deleteDossierId) {
            await onDeleteDossier(deleteDossierId);
            setDeleteDossierId(null);
          }
        }}
        onCancel={() => setDeleteDossierId(null)}
      />
    </Modal>
  );
}

function ClientForm({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (c: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
  initial: Client | null;
}) {
  const [form, setForm] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    nif_rc: '',
    observations: '',
    wilaya: 'Khenchela',
    daira: '',
    commune: '',
    section: '',
    ilot: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (initial) {
      setForm({
        nom: initial.nom,
        telephone: initial.telephone ?? '',
        email: initial.email ?? '',
        adresse: initial.adresse ?? '',
        nif_rc: initial.nif_rc ?? '',
        observations: initial.observations ?? '',
        wilaya: initial.wilaya ?? 'Khenchela',
        daira: initial.daira ?? '',
        commune: initial.commune ?? '',
        section: initial.section ?? '',
        ilot: initial.ilot ?? '',
      });
    } else {
      setForm({
        nom: '',
        telephone: '',
        email: '',
        adresse: '',
        nif_rc: '',
        observations: '',
        wilaya: 'Khenchela',
        daira: '',
        commune: '',
        section: '',
        ilot: '',
      });
    }
  }, [initial]);

  function handleCommuneChange(commune: string) {
    const daira = commune ? dairaPourCommune(commune) : '';
    setForm({ ...form, commune, daira });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) {
      setError('Le nom / raison sociale est obligatoire');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nom: form.nom.trim(),
        telephone: form.telephone || null,
        email: form.email || null,
        adresse: form.adresse || null,
        nif_rc: form.nif_rc || null,
        observations: form.observations || null,
        wilaya: form.wilaya || 'Khenchela',
        daira: form.daira || null,
        commune: form.commune || null,
        section: form.section || null,
        ilot: form.ilot || null,
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
      title={initial ? 'Modifier le client' : 'Nouveau client'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom / Raison sociale" required>
          <input
            className={inputCls}
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Téléphone">
            <input
              className={inputCls}
              value={form.telephone}
              onChange={(e) =>
                setForm({ ...form, telephone: e.target.value })
              }
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Adresse">
          <input
            className={inputCls}
            value={form.adresse}
            onChange={(e) => setForm({ ...form, adresse: e.target.value })}
          />
        </Field>
        <Field label="NIF / RC">
          <input
            className={inputCls}
            value={form.nif_rc}
            onChange={(e) => setForm({ ...form, nif_rc: e.target.value })}
          />
        </Field>

        {/* Section Localisation */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-bold text-gray-700 text-sm mb-3">Localisation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Wilaya">
              <input
                className={`${inputCls} bg-gray-100`}
                value={form.wilaya}
                readOnly
              />
              <p className="text-xs text-gray-400 mt-1">
                Wilaya fixée automatiquement
              </p>
            </Field>
            <Field label="Daïra">
              <input
                className={`${inputCls} bg-gray-100`}
                value={form.daira}
                readOnly
                placeholder="Rempli automatiquement"
              />
            </Field>
            <Field label="Commune">
              <select
                className={selectCls}
                value={form.commune}
                onChange={(e) => handleCommuneChange(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {COMMUNES_KHENCHELA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Section">
                <input
                  className={inputCls}
                  value={form.section}
                  onChange={(e) =>
                    setForm({ ...form, section: e.target.value })
                  }
                  placeholder="N° de section"
                />
              </Field>
              <Field label="Îlot">
                <input
                  className={inputCls}
                  value={form.ilot}
                  onChange={(e) => setForm({ ...form, ilot: e.target.value })}
                  placeholder="N° d'îlot"
                />
              </Field>
            </div>
          </div>
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
