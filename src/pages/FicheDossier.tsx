import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Pencil,
  FileText,
  CreditCard,
  Scale,
  Plus,
  Trash2,
  Printer,
  FolderOpen,
  Search,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import type {
  Client,
  Dossier,
  DossierWithClient,
  Paiement,
  Expertise,
  DocumentRow,
  Laboratoire,
  DocumentCategorie,
} from '@/types';
import { EtatBadge, EcheanceBadge, DomaineBadge } from '@/components/Badges';
import { ProgressBar } from '@/components/ProgressBar';
import { Modal } from '@/components/Modal';
import { Field, inputCls, selectCls, textareaCls } from '@/components/Field';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  formatMontant,
  formatDate,
  joursRestants,
  statutEcheance,
  calculReste,
  calculPctPaiement,
  formatTaille,
  todayISO,
} from '@/utils/helpers';
import {
  DOCUMENT_CATEGORIES,
  MODES_PAIEMENT,
  JURIDICTIONS,
  isExtensionValide,
} from '@/types';
import { fileSystemService } from '@/services/fileSystemService';
import * as dataService from '@/services/data';

interface FicheDossierProps {
  dossier: DossierWithClient;
  clients: Client[];
  paiements: Paiement[];
  expertise: Expertise | null;
  documents: DocumentRow[];
  onBack: () => void;
  onEdit: (d: Dossier) => void;
  onRefresh: () => void;
  onCreatePaiement: (p: Omit<Paiement, 'id' | 'created_at'>) => Promise<void>;
  onDeletePaiement: (id: string) => Promise<void>;
  onCreateDocument: (d: Omit<DocumentRow, 'id' | 'created_at'>) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onUpdateDocumentPath: (id: string, localPath: string) => Promise<void>;
  onVerifyDocument: (id: string, statut: string) => Promise<void>;
  onCreateExpertise: (
    e: Omit<Expertise, 'id' | 'created_at' | 'numero'>
  ) => Promise<void>;
  onUpdateExpertise: (id: string, e: Partial<Expertise>) => Promise<void>;
}

export function FicheDossier({
  dossier,
  clients,
  paiements,
  expertise,
  documents,
  onBack,
  onEdit,
  onRefresh,
  onCreatePaiement,
  onDeletePaiement,
  onCreateDocument,
  onDeleteDocument,
  onUpdateDocumentPath,
  onVerifyDocument,
  onCreateExpertise,
  onUpdateExpertise,
}: FicheDossierProps) {
  const [paiementOpen, setPaiementOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [expertiseOpen, setExpertiseOpen] = useState(false);
  const [deletePaiementId, setDeletePaiementId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [editPathDoc, setEditPathDoc] = useState<DocumentRow | null>(null);
  const [docStatusMsg, setDocStatusMsg] = useState<string>('');

  const totalPaye = paiements.reduce(
    (s, p) => s + (Number(p.montant) || 0),
    0
  );
  const reste = calculReste(dossier.prix_total, totalPaye);
  const pctPaiement = calculPctPaiement(dossier.prix_total, totalPaye);
  const jr = joursRestants(dossier.date_limite);
  const st = statutEcheance(dossier.date_limite, dossier.etat);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{dossier.numero}</h1>
            <p className="text-sm text-gray-500">
              {dossier.client?.nom ?? 'Client inconnu'} — {dossier.prestation}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(dossier)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            <Pencil size={16} />
            Modifier
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} />
            Imprimer
          </button>
        </div>
      </div>

      {/* Infos générales */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoItem label="N° Dossier" value={dossier.numero} />
          <InfoItem label="Client" value={dossier.client?.nom ?? '—'} />
          <InfoItem label="Téléphone" value={dossier.telephone ?? '—'} />
          <InfoItem label="Référence" value={dossier.reference ?? '—'} />
          <InfoItem label="Domaine">
            <DomaineBadge domaine={dossier.domaine} />
          </InfoItem>
          <InfoItem label="Prestation" value={dossier.prestation === 'Autre' && dossier.prestation_autre ? dossier.prestation_autre : dossier.prestation} />
          <InfoItem
            label="Date de réception"
            value={formatDate(dossier.date_reception)}
          />
          <InfoItem
            label="Date limite"
            value={formatDate(dossier.date_limite)}
          />
          <InfoItem label="Jours restants">
            <span
              className={
                jr === null
                  ? 'text-gray-400'
                  : jr < 0
                    ? 'text-red-600 font-bold'
                    : jr <= 7
                      ? 'text-orange-600 font-semibold'
                      : 'text-green-600 font-semibold'
              }
            >
              {jr === null ? '—' : `${jr} jour(s)`}
            </span>
          </InfoItem>
          <InfoItem label="État des pièces" value={dossier.etat_pieces ?? '—'} />
          <InfoItem label="Pièces manquantes" value={dossier.pieces_manquantes ?? '—'} />
          <InfoItem label="Étape actuelle" value={dossier.etape_actuelle ?? '—'} />
          <InfoItem label="État">
            <EtatBadge etat={dossier.etat} />
          </InfoItem>
          <InfoItem label="Échéance">
            <EcheanceBadge statut={st} />
          </InfoItem>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <InfoItem
              label="Prix total"
              value={formatMontant(dossier.prix_total)}
            />
            <InfoItem
              label="Total payé"
              value={formatMontant(totalPaye)}
            />
            <InfoItem
              label="Reste"
              value={
                <span className={reste > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                  {formatMontant(reste)}
                </span>
              }
            />
            <InfoItem label="% Paiement" value={`${pctPaiement}%`} />
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Avancement</p>
            <ProgressBar value={dossier.avancement} />
          </div>
          {dossier.observations && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Observations</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                {dossier.observations}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sections: Documents, Paiements, Expertise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents */}
        <Section
          title="Documents"
          icon={<FileText size={18} />}
          count={documents.length}
          action={
            <button
              onClick={() => setDocOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition-colors"
            >
              <Plus size={14} />
              Ajouter
            </button>
          }
        >
          {documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucun document
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {doc.nom_fichier}
                      </p>
                      <p className="text-xs text-gray-400">
                        {doc.categorie} — {formatDate(doc.created_at)}
                        {doc.extension && ` — ${doc.extension.toUpperCase()}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${
                        doc.statut === 'DISPONIBLE'
                          ? 'bg-green-100 text-green-700'
                          : doc.statut === 'INTROUVABLE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {doc.statut === 'DISPONIBLE'
                        ? 'Disponible'
                        : doc.statut === 'INTROUVABLE'
                          ? 'Introuvable'
                          : 'Non vérifié'}
                    </span>
                  </div>
                  {doc.local_path && (
                    <p
                      className="text-xs text-gray-400 mt-1 truncate font-mono"
                      title={doc.local_path}
                    >
                      {doc.local_path}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={async () => {
                        const result = await fileSystemService.fileExists(doc.local_path);
                        const statut = result.existe ? 'DISPONIBLE' : 'INTROUVABLE';
                        await onVerifyDocument(doc.id, statut);
                        setDocStatusMsg(result.message);
                      }}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                      title="Vérifier"
                    >
                      <Search size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        const result = await fileSystemService.openFile(doc.local_path);
                        setDocStatusMsg(result.message);
                      }}
                      className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                      title="Ouvrir le document"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        const result = await fileSystemService.openFolder(doc.local_path);
                        setDocStatusMsg(result.message);
                      }}
                      className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                      title="Ouvrir l'emplacement"
                    >
                      <FolderOpen size={14} />
                    </button>
                    <button
                      onClick={() => setEditPathDoc(doc)}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Modifier le chemin"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteDocId(doc.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Paiements */}
        <Section
          title="Paiements"
          icon={<CreditCard size={18} />}
          count={paiements.length}
          action={
            <button
              onClick={() => setPaiementOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition-colors"
            >
              <Plus size={14} />
              Ajouter
            </button>
          }
        >
          {paiements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucun paiement
            </p>
          ) : (
            <div className="space-y-2">
              {paiements.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <CreditCard size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">
                      {formatMontant(p.montant)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(p.date)} — {p.mode_paiement}
                      {p.reference ? ` — ${p.reference}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeletePaiementId(p.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Total payé:</span>
                <span className="font-bold text-gray-800">
                  {formatMontant(totalPaye)}
                </span>
              </div>
            </div>
          )}
        </Section>

        {/* Expertise liée */}
        <Section
          title="Expertise liée"
          icon={<Scale size={18} />}
          count={expertise ? 1 : 0}
          action={
            !expertise ? (
              <button
                onClick={() => setExpertiseOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition-colors"
              >
                <Plus size={14} />
                Lier expertise
              </button>
            ) : undefined
          }
          className="lg:col-span-2"
        >
          {!expertise ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune expertise judiciaire liée à ce dossier
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoItem label="N° Expertise" value={expertise.numero} />
              <InfoItem
                label="Partie / Demandeur"
                value={expertise.partie_demandeur ?? '—'}
              />
              <InfoItem
                label="Date de réception"
                value={formatDate(expertise.date_reception)}
              />
              <InfoItem
                label="Délai accordé"
                value={expertise.delai_accorde ?? '—'}
              />
              <InfoItem
                label="Date limite"
                value={formatDate(expertise.date_limite)}
              />
              <InfoItem
                label="Juridiction"
                value={expertise.juridiction ?? '—'}
              />
              <InfoItem
                label="Nature / Mission"
                value={expertise.nature_mission ?? '—'}
              />
              <InfoItem
                label="Date dépôt rapport"
                value={formatDate(expertise.date_depot_rapport)}
              />
              <InfoItem label="État">
                <EtatBadge etat={expertise.etat} />
              </InfoItem>
              <div className="md:col-span-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Avancement
                </p>
                <ProgressBar value={expertise.avancement} />
              </div>
              {expertise.observations && (
                <div className="md:col-span-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Observations
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {expertise.observations}
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Modals */}
      <PaiementForm
        open={paiementOpen}
        onClose={() => setPaiementOpen(false)}
        dossierId={dossier.id}
        onSave={async (data) => {
          await onCreatePaiement(data);
          setPaiementOpen(false);
        }}
      />

      <DocumentForm
        open={docOpen}
        onClose={() => setDocOpen(false)}
        onSave={async (data) => {
          await onCreateDocument(data);
          setDocOpen(false);
        }}
        dossierId={dossier.id}
        dossierNumero={dossier.numero}
      />

      <ExpertiseForm
        open={expertiseOpen}
        onClose={() => setExpertiseOpen(false)}
        onSave={async (data) => {
          await onCreateExpertise(data);
          setExpertiseOpen(false);
        }}
        existing={expertise}
        onUpdate={async (data) => {
          if (expertise) await onUpdateExpertise(expertise.id, data);
          setExpertiseOpen(false);
        }}
      />

      <ConfirmDialog
        open={!!deletePaiementId}
        message="Voulez-vous réellement supprimer ce paiement ?"
        onConfirm={async () => {
          if (deletePaiementId) {
            await onDeletePaiement(deletePaiementId);
            setDeletePaiementId(null);
          }
        }}
        onCancel={() => setDeletePaiementId(null)}
      />

      <ConfirmDialog
        open={!!deleteDocId}
        message="Voulez-vous réellement supprimer ce document ?"
        onConfirm={async () => {
          if (deleteDocId) {
            await onDeleteDocument(deleteDocId);
            setDeleteDocId(null);
          }
        }}
        onCancel={() => setDeleteDocId(null)}
      />

      {/* Edit path modal */}
      <Modal
        open={!!editPathDoc}
        onClose={() => setEditPathDoc(null)}
        title="Modifier le chemin du fichier"
        size="md"
      >
        {editPathDoc && (
          <EditPathForm
            doc={editPathDoc}
            onClose={() => setEditPathDoc(null)}
            onSave={async (newPath) => {
              await onUpdateDocumentPath(editPathDoc.id, newPath);
              setEditPathDoc(null);
            }}
          />
        )}
      </Modal>

      {/* Status message toast */}
      {docStatusMsg && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-white border border-gray-200 shadow-lg rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FileCheck size={18} className="text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 whitespace-pre-line">{docStatusMsg}</p>
              <button
                onClick={() => setDocStatusMsg('')}
                className="text-xs text-sky-600 hover:underline mt-2"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
      {children ?? (
        <p className="text-sm text-gray-800">{value ?? '—'}</p>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  action,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <h3 className="font-bold text-gray-800">{title}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ===== Paiement Form =====
function PaiementForm({
  open,
  onClose,
  onSave,
  dossierId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (p: Omit<Paiement, 'id' | 'created_at'>) => Promise<void>;
  dossierId: string;
}) {
  const [form, setForm] = useState({
    date: todayISO(),
    montant: '',
    mode_paiement: 'ESPÈCES',
    reference: '',
    observation: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        date: todayISO(),
        montant: '',
        mode_paiement: 'ESPÈCES',
        reference: '',
        observation: '',
      });
      setError('');
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = parseFloat(form.montant);
    if (isNaN(m) || m <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        date: form.date,
        montant: m,
        mode_paiement: form.mode_paiement,
        reference: form.reference || null,
        observation: form.observation || null,
        dossier_id: dossierId,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un paiement" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Date" required>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Montant (DA)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
            />
          </Field>
          <Field label="Mode de paiement">
            <select
              className={selectCls}
              value={form.mode_paiement}
              onChange={(e) =>
                setForm({ ...form, mode_paiement: e.target.value })
              }
            >
              {MODES_PAIEMENT.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Référence">
            <input
              className={inputCls}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Observation">
          <textarea
            className={textareaCls}
            value={form.observation}
            onChange={(e) =>
              setForm({ ...form, observation: e.target.value })
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

// ===== Document Form =====
function DocumentForm({
  open,
  onClose,
  onSave,
  dossierId,
  dossierNumero,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: Omit<DocumentRow, 'id' | 'created_at'>) => Promise<void>;
  dossierId: string;
  dossierNumero: string;
}) {
  const [categorie, setCategorie] = useState<DocumentCategorie>(
    '01_PIECES_CLIENT'
  );
  const [observation, setObservation] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    nom: string;
    extension: string;
    taille: number;
    typeMime: string;
    chemin: string;
  } | null>(null);
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategorie('01_PIECES_CLIENT');
      setObservation('');
      setSelectedFile(null);
      setLocalPath('');
      setError('');
    }
  }, [open]);

  async function handleSelectFile() {
    const file = await fileSystemService.selectFile();
    if (file) {
      setSelectedFile(file);
      // Pre-fill local path with the file name (browser doesn't give full path)
      setLocalPath(file.chemin);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile && !localPath) {
      setError('Veuillez sélectionner un fichier ou saisir un chemin');
      return;
    }
    const chemin = localPath || selectedFile?.chemin || '';
    if (!chemin) {
      setError('Veuillez saisir le chemin complet du fichier');
      return;
    }
    const ext =
      selectedFile?.extension ||
      chemin.split('.').pop()?.toLowerCase() ||
      '';
    if (ext && !isExtensionValide(ext)) {
      setError(
        'Format non supporté. Formats acceptés: PDF, JPG, PNG, DOCX, XLSX, DWG, DXF, DWS, DWT, GMAP, GMW, GMP, GML, KML, KMZ, SHP, PRJ, DBF, SHX, TAB, MIF, MID, CSV, TXT, XYZ, ASC, PTS, JOB, JXL, XML, RAW, DAT'
      );
      return;
    }
    setSaving(true);
    try {
      const nomFichier =
        selectedFile?.nom || chemin.split(/[\\/]/).pop() || chemin;
      await onSave({
        dossier_id: dossierId,
        nom_fichier: nomFichier,
        categorie,
        chemin_stockage: null,
        extension: ext,
        local_path: chemin,
        statut: 'NON_VÉRIFIÉ',
        taille: selectedFile?.taille ?? 0,
        type_mime: selectedFile?.typeMime ?? null,
        observation: observation || null,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une référence de document" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            Le fichier ne sera PAS copié. Seul son chemin sera enregistré.
          </p>
        </div>

        <Field label="Catégorie" required>
          <select
            className={selectCls}
            value={categorie}
            onChange={(e) =>
              setCategorie(e.target.value as DocumentCategorie)
            }
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fichier" required>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectFile}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-sky-400 transition-colors text-sm text-gray-600"
            >
              <FileText size={16} className="text-gray-400" />
              {selectedFile ? selectedFile.nom : 'Choisir un fichier...'}
            </button>
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-400 mt-1">
              Extension: {selectedFile.extension.toUpperCase()} — Taille: {formatTaille(selectedFile.taille)}
            </p>
          )}
        </Field>

        <Field label="Chemin complet du fichier" required>
          <input
            className={inputCls}
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="Ex: D:\PROJETS\2026\TOPO\LOT_A\LEVE.dwg"
          />
          <p className="text-xs text-gray-400 mt-1">
            Saisissez le chemin complet du fichier sur votre PC. Le fichier ne sera pas copié.
          </p>
        </Field>

        <Field label="Observation">
          <textarea
            className={textareaCls}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
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
            {saving ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ===== Edit Path Form =====
function EditPathForm({
  doc,
  onClose,
  onSave,
}: {
  doc: DocumentRow;
  onClose: () => void;
  onSave: (newPath: string) => Promise<void>;
}) {
  const [newPath, setNewPath] = useState(doc.local_path || '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPath.trim()) return;
    setSaving(true);
    try {
      await onSave(newPath.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-700">
          Le fichier ne sera PAS copié. Seul le chemin sera mis à jour.
        </p>
      </div>
      <Field label="Ancien chemin">
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-2 font-mono break-all">
          {doc.local_path || '—'}
        </p>
      </Field>
      <Field label="Nouveau chemin" required>
        <input
          className={inputCls}
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder="Ex: E:\ARCHIVES\PROJET_A\PLAN.dwg"
        />
      </Field>
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
          {saving ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
      </div>
    </form>
  );
}

// ===== Expertise Form =====
function ExpertiseForm({
  open,
  onClose,
  onSave,
  existing,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: Omit<Expertise, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  existing: Expertise | null;
  onUpdate: (e: Partial<Expertise>) => Promise<void>;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        partie_demandeur: existing.partie_demandeur ?? '',
        date_reception: existing.date_reception
          ? new Date(existing.date_reception).toISOString().split('T')[0]
          : todayISO(),
        delai_accorde: existing.delai_accorde ?? '',
        date_limite: existing.date_limite
          ? new Date(existing.date_limite).toISOString().split('T')[0]
          : '',
        juridiction: existing.juridiction ?? '',
        nature_mission: existing.nature_mission ?? '',
        avancement: String(existing.avancement ?? '0'),
        etat: existing.etat ?? 'NOUVEAU',
        observations: existing.observations ?? '',
        date_depot_rapport: existing.date_depot_rapport
          ? new Date(existing.date_depot_rapport).toISOString().split('T')[0]
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
  }, [existing, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
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
      };
      if (existing) {
        await onUpdate(data);
      } else {
        await onSave({ ...data, dossier_id: '' });
      }
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
      title={existing ? 'Modifier l\'expertise' : 'Lier une expertise judiciaire'}
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
