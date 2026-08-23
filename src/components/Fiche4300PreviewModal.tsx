import { useEffect, useMemo, useState } from 'react';
import { Printer, Save, X, FileText } from 'lucide-react';
import {
  buildFiche4300Html,
  downloadFiche4300,
  fiche4300FileName,
  printFiche4300,
  type Fiche4300Data,
} from './fiche4300Document';

interface Fiche4300PreviewModalProps {
  open: boolean;
  data: Fiche4300Data;
  onClose: () => void;
}

export function Fiche4300PreviewModal({ open, data, onClose }: Fiche4300PreviewModalProps) {
  const [no1, setNo1] = useState(data.dossierNo1);
  const [no2, setNo2] = useState(data.dossierNo2);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setNo1(data.dossierNo1);
      setNo2(data.dossierNo2);
      setSaved(false);
    }
  }, [open, data.dossierNo1, data.dossierNo2]);

  const html = useMemo(
    () => buildFiche4300Html({ ...data, dossierNo1: no1, dossierNo2: no2 }),
    [data, no1, no2]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex flex-col bg-slate-900/60 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-sky-600" />
          <div>
            <h2 className="text-sm font-bold text-gray-800 leading-tight">
              Aperçu — Fiche de renseignements
            </h2>
            <p className="text-xs text-gray-500">Instruction n° 4300 — article 166 LF 2025</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="hidden md:flex items-center gap-1.5 text-xs font-medium text-gray-600">
            N° du dossier
            <input
              value={no1}
              onChange={(e) => setNo1(e.target.value)}
              placeholder="……"
              className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <span>/</span>
            <input
              value={no2}
              onChange={(e) => setNo2(e.target.value)}
              placeholder="…"
              className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              downloadFiche4300(html, fiche4300FileName({ ...data, dossierNo1: no1, dossierNo2: no2 }));
              setSaved(true);
              setTimeout(() => setSaved(false), 3000);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors"
          >
            <Save size={16} />
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => printFiche4300(html)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <X size={16} />
            Fermer
          </button>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-center text-sm text-emerald-700 font-medium">
          Document enregistré au format Word (.doc) — le modèle original n'est jamais modifié.
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        <iframe
          title="Aperçu de la fiche de renseignements"
          srcDoc={html}
          className="mx-auto block h-full w-full max-w-[1000px] rounded-lg border-0 bg-white shadow-2xl"
        />
      </div>
    </div>
  );
}
