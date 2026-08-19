import { useState } from 'react';
import { Bot, Check, Sparkles } from 'lucide-react';

interface Props {
  activity: string;
  rubrique: string;
  criterion?: string;
  unit?: string;
  projectDescription: string;
  onUseEstimate?: (value: string) => void;
}

export function EstimationIABox({ activity, rubrique, criterion, unit, projectDescription, onUseEstimate }: Props) {
  const [estimate, setEstimate] = useState('');
  const [loading, setLoading] = useState(false);

  function estimateValue() {
    setLoading(true);
    window.setTimeout(() => {
      setEstimate('');
      setLoading(false);
    }, 350);
  }

  return (
    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-indigo-900 font-semibold">
            <Bot size={18} /> Estimation IA
          </div>
          <p className="text-xs text-indigo-700 mt-1">
            Estimation séparée et facultative pour la valeur de classement de la rubrique {rubrique}.
          </p>
        </div>
        <Sparkles size={18} className="text-indigo-500" />
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-white border border-indigo-100 p-3"><div className="text-gray-500">Activité</div><div className="font-semibold text-gray-800 mt-1">{activity || '—'}</div></div>
        <div className="rounded-lg bg-white border border-indigo-100 p-3"><div className="text-gray-500">Critère</div><div className="font-semibold text-gray-800 mt-1">{criterion || 'Selon la rubrique'}</div></div>
        <div className="rounded-lg bg-white border border-indigo-100 p-3"><div className="text-gray-500">Unité</div><div className="font-semibold text-gray-800 mt-1">{unit || '—'}</div></div>
      </div>

      <div className="mt-3 rounded-lg bg-white border border-indigo-100 p-3 text-xs text-gray-600">
        <strong>Données utilisées :</strong> description du projet et informations déjà saisies dans le module.
        <div className="mt-1 line-clamp-3">{projectDescription || 'Aucune donnée supplémentaire.'}</div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={estimateValue} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">
          <Sparkles size={14} /> {loading ? 'Analyse...' : 'Proposer une estimation'}
        </button>
        {estimate && <button type="button" onClick={() => onUseEstimate?.(estimate)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"><Check size={14}/> Utiliser l’estimation</button>}
      </div>

      {estimate ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-semibold">Valeur estimative : {estimate} {unit || ''}</div>
          <div className="text-xs mt-1">Estimation IA préliminaire — à confirmer avant validation réglementaire.</div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-indigo-700">Aucune valeur n’est ajoutée automatiquement au classement.</div>
      )}
    </div>
  );
}
