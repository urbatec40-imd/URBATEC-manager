import { Sparkles } from 'lucide-react';
import { inputCls } from '@/components/Field';

export function EnvironnementEstimationCard({ criterion, onPrepare }: { criterion?: string; onPrepare?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-gray-800">Estimation IA</h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Valeur estimative</span>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Cette carte est indépendante de la valeur officielle. Elle sert uniquement à proposer une estimation lorsque la valeur réelle n’est pas disponible.
      </p>
      {criterion && (
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
          <div className="text-xs text-gray-500">Critère demandé par la Rubrique</div>
          <div className="font-semibold text-gray-800 mt-1">{criterion}</div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <button type="button" onClick={onPrepare} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <Sparkles size={16} /> Préparer l’estimation IA
        </button>
        <input className={inputCls} placeholder="Valeur approximative" aria-label="Valeur approximative" />
        <button type="button" disabled className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold disabled:opacity-40">
          Utiliser cette estimation
        </button>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        L’estimation doit rester marquée « estimative » et être confirmée avant validation réglementaire.
      </div>
    </div>
  );
}
