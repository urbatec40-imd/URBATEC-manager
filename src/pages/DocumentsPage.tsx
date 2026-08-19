import { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  FileText,
  FolderOpen,
  FileCheck,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import type { DocumentWithDossier, DocumentCategorie } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { Field, inputCls } from '@/components/Field';
import { formatDate, formatTaille } from '@/utils/helpers';
import { DOCUMENT_CATEGORIES } from '@/types';
import { fileSystemService } from '@/services/fileSystemService';

interface DocumentsPageProps {
  documents: DocumentWithDossier[];
  onOpenDossier: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdatePath: (id: string, localPath: string) => Promise<void>;
  onVerify: (id: string, statut: string) => Promise<void>;
}

export function DocumentsPage({
  documents,
  onOpenDossier,
  onDelete,
  onUpdatePath,
  onVerify,
}: DocumentsPageProps) {
  const [query, setQuery] = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [deleteDoc, setDeleteDoc] = useState<string | null>(null);
  const [editPathDoc, setEditPathDoc] = useState<DocumentWithDossier | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (filtreCat && d.categorie !== filtreCat) return false;
      if (!q) return true;
      return [d.nom_fichier, d.dossier?.numero ?? '', d.observation ?? '', d.local_path ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [documents, query, filtreCat]);

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={`${documents.length} document(s)`}
      />

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
            placeholder="Rechercher par nom, dossier, chemin, observation..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        <select
          value={filtreCat}
          onChange={(e) => setFiltreCat(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="">Toutes catégories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-3 text-left font-semibold">N° Dossier</th>
                <th className="px-4 py-3 text-left font-semibold">Nom du fichier</th>
                <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                <th className="px-4 py-3 text-left font-semibold">Chemin</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Aucun document
                  </td>
                </tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-sky-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => d.dossier && onOpenDossier(d.dossier.id)}
                      className="font-semibold text-sky-700 hover:underline whitespace-nowrap"
                    >
                      {d.dossier?.numero ?? '—'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-gray-800 font-medium">{d.nom_fichier}</p>
                        {d.extension && (
                          <p className="text-xs text-gray-400 uppercase">{d.extension}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {d.categorie}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-gray-500 truncate font-mono" title={d.local_path ?? ''}>
                      {d.local_path ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        d.statut === 'DISPONIBLE'
                          ? 'bg-green-100 text-green-700'
                          : d.statut === 'INTROUVABLE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {d.statut === 'DISPONIBLE'
                        ? 'Disponible'
                        : d.statut === 'INTROUVABLE'
                          ? 'Introuvable'
                          : 'Non vérifié'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={async () => {
                          const result = await fileSystemService.fileExists(d.local_path ?? '');
                          const statut = result.existe ? 'DISPONIBLE' : 'INTROUVABLE';
                          await onVerify(d.id, statut);
                          setStatusMsg(result.message);
                        }}
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
                        title="Vérifier"
                      >
                        <Search size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          const result = await fileSystemService.openFile(d.local_path ?? '');
                          setStatusMsg(result.message);
                        }}
                        className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                        title="Ouvrir le document"
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          const result = await fileSystemService.openFolder(d.local_path ?? '');
                          setStatusMsg(result.message);
                        }}
                        className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors"
                        title="Ouvrir l'emplacement"
                      >
                        <FolderOpen size={15} />
                      </button>
                      <button
                        onClick={() => setEditPathDoc(d)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                        title="Modifier le chemin"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteDoc(d.id)}
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

      <ConfirmDialog
        open={!!deleteDoc}
        message="Voulez-vous réellement supprimer ce document ?"
        onConfirm={async () => {
          if (deleteDoc) {
            await onDelete(deleteDoc);
            setDeleteDoc(null);
          }
        }}
        onCancel={() => setDeleteDoc(null)}
      />

      {/* Edit path modal */}
      <Modal
        open={!!editPathDoc}
        onClose={() => setEditPathDoc(null)}
        title="Modifier le chemin du fichier"
        size="md"
      >
        {editPathDoc && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem('newPath') as HTMLInputElement;
              if (input.value.trim()) {
                await onUpdatePath(editPathDoc.id, input.value.trim());
                setEditPathDoc(null);
              }
            }}
            className="space-y-4"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                Le fichier ne sera PAS copié. Seul le chemin sera mis à jour.
              </p>
            </div>
            <Field label="Ancien chemin">
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-2 font-mono break-all">
                {editPathDoc.local_path ?? '—'}
              </p>
            </Field>
            <Field label="Nouveau chemin" required>
              <input
                name="newPath"
                className={inputCls}
                defaultValue={editPathDoc.local_path ?? ''}
                placeholder="Ex: E:\ARCHIVES\PROJET_A\PLAN.dwg"
              />
            </Field>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditPathDoc(null)}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors"
              >
                Mettre à jour
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Status message toast */}
      {statusMsg && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-white border border-gray-200 shadow-lg rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FileCheck size={18} className="text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 whitespace-pre-line">{statusMsg}</p>
              <button
                onClick={() => setStatusMsg('')}
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
