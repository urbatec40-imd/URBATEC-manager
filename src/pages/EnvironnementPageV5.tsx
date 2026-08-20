import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, FileText, SearchCheck } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate, type ActivityRowLike } from '@/services/activiteMatcher';

interface Documents { impact?: boolean; danger?: boolean; notice?: boolean; rapportDangereux?: boolean }
interface DecisionRow { regime: string; rayon?: string; condition?: string; documents?: Documents }
interface Row extends ActivityRowLike { decisionRows?: DecisionRow[]; isSelectable?: boolean }
interface Dataset { version: string; rubriques: Row[]; sourceUrl?: string }

const SOURCE = 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF';
const EMPTY: Dataset = { version: '07-144-semantic-v3', rubriques: [], sourceUrl: SOURCE };

function clean(v: string) {
  return (v || '').replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à').replace(/â€™/g, '’').replace(/\s+/g, ' ').trim();
}
function norm(v: string) {
  return clean(v).toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`´]/g, ' ').replace(/[^\p{L}\p{N}.,<>=-]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
function regimeLabel(v: string) {
  return ({ AM: 'Autorisation ministérielle', AW: 'Autorisation du wali / wali délégué', APAPC: 'Autorisation du Président de l’APC', D: 'Déclaration auprès du Président de l’APC' } as Record<string, string>)[v] ?? v;
}
function category(v: string) {
  return ({ AM: 'Catégorie 1', AW: 'Catégorie 2', APAPC: 'Catégorie 3', D: 'Catégorie 4' } as Record<string, string>)[v] ?? 'Catégorie à déterminer';
}
function documentsFor(r: DecisionRow) {
  const d = r.documents ?? {};
  return [d.impact && 'Étude d’impact', d.danger && 'Étude de danger', d.notice && 'Notice d’impact', d.rapportDangereux && 'Rapport sur les produits dangereux'].filter(Boolean) as string[];
}

function unitFromCondition(condition: string) {
  const c = condition.toLocaleLowerCase('fr-FR');
  const patterns: Array<[RegExp, string]> = [
    [/animaux[- ]?équivalents|animaux-équivalents|animaux\b/, 'animaux'],
    [/kg\/j|kg par jour/, 'kg/j'], [/t\/j|tonnes?\s*(?:par|\/)\s*jour/, 't/j'],
    [/m³\/j|m3\/j|m3 par jour/, 'm³/j'], [/m³|m3/, 'm³'], [/m²|m2/, 'm²'],
    [/kw/, 'kW'], [/kva/, 'kVA'], [/mw/, 'MW'], [/litres?|\bl\b/, 'L'],
    [/tonnes?|\bt\b/, 't'], [/kg/, 'kg'], [/bar/, 'bar'], [/°c|celsius/, '°C'], [/km/, 'km'],
  ];
  return patterns.find(([re]) => re.test(c))?.[1] ?? '';
}
function labelFromCondition(condition: string, unit: string) {
  const c = condition.toLocaleLowerCase('fr-FR');
  if (/animaux/.test(c)) return 'Nombre / capacité d’animaux';
  if (/puissance|kw|kva|mw/.test(c)) return 'Puissance';
  if (/surface|m²|m2/.test(c)) return 'Surface';
  if (/volume|m³|m3/.test(c)) return 'Volume';
  if (/pression|bar/.test(c)) return 'Pression';
  if (/température|°c|celsius/.test(c)) return 'Température';
  if (/nombre|effectif/.test(c)) return 'Nombre';
  if (/capacité/.test(c)) return 'Capacité';
  return unit === 'kg' || unit === 't' || unit === 'L' ? 'Quantité / poids' : 'Valeur réglementaire';
}
function numberAfter(text: string, phrase: RegExp) {
  const m = text.match(phrase); if (!m) return null;
  const n = m[1].replace(/\s/g, '').replace(',', '.'); const value = Number(n); return Number.isFinite(value) ? value : null;
}
function toComparable(value: number, inputUnit: string, conditionUnit: string) {
  if (!conditionUnit || !inputUnit || inputUnit === conditionUnit) return value;
  if (inputUnit === 't' && conditionUnit === 'kg') return value * 1000;
  if (inputUnit === 'kg' && conditionUnit === 't') return value / 1000;
  if (inputUnit === 'L' && conditionUnit === 'm³') return value / 1000;
  if (inputUnit === 'm³' && conditionUnit === 'L') return value * 1000;
  return value;
}
function matchesCondition(condition: string, rawValue: string, inputUnit: string) {
  const value = Number(rawValue.replace(',', '.')); if (!Number.isFinite(value)) return false;
  const c = norm(condition);
  const unit = unitFromCondition(condition);
  const v = toComparable(value, inputUnit, unit);

  const minInclusive = numberAfter(c, /superieure(?: ou egale)? a\s*([0-9][0-9\s.,]*)/i);
  const maxInclusive = numberAfter(c, /inferieure(?: ou egale)? a\s*([0-9][0-9\s.,]*)/i);
  const more = numberAfter(c, /plus de\s*([0-9][0-9\s.,]*)/i);
  const less = numberAfter(c, /moins de\s*([0-9][0-9\s.,]*)/i);
  const range = c.match(/de\s*([0-9][0-9\s.,]*)\s*a\s*([0-9][0-9\s.,]*)/i);
  if (minInclusive != null) return v >= minInclusive;
  if (maxInclusive != null) return v <= maxInclusive;
  if (more != null) return v > more;
  if (less != null) return v < less;
  if (range) {
    const a = Number(range[1].replace(/\s/g, '').replace(',', '.')); const b = Number(range[2].replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(a) && Number.isFinite(b)) return v >= a && v <= b;
  }
  return false;
}
function inferUnit(rows: DecisionRow[]) {
  const units = Array.from(new Set(rows.map(r => unitFromCondition(r.condition ?? '')).filter(Boolean)));
  return units[0] ?? '';
}
function inferLabel(rows: DecisionRow[], unit: string) {
  return labelFromCondition(rows.find(r => unitFromCondition(r.condition ?? '') === unit)?.condition ?? rows[0]?.condition ?? '', unit);
}

export function EnvironnementPageV5({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<DecisionRow | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/data/nomenclature-07-144-semantic-v3.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json() as Dataset; })
      .then(data => setDataset({ ...data, rubriques: (data.rubriques ?? []).map(r => ({ ...r, designation: clean(r.designation), familleLabel: clean(r.familleLabel) })) }))
      .catch(e => setError((e as Error).message));
  }, []);

  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques]);
  const suggestions = useMemo(() => suggestActivities(index, query, 12), [index, query]);
  const rows = selected?.decisionRows ?? [];
  const unit = useMemo(() => inferUnit(rows), [rows]);
  const label = useMemo(() => inferLabel(rows, unit), [rows, unit]);

  function acceptActivity(candidate: ActivityRowLike) {
    const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique); if (!row) return;
    setSelected(row); setQuery(`${row.rubrique} — ${row.designation}`); setValue(''); setResult(null); setError('');
  }
  function analyse() {
    if (!value.trim()) { setError(`Veuillez saisir ${label.toLocaleLowerCase('fr-FR')}${unit ? ` en ${unit}` : ''}.`); return; }
    const matches = rows.filter(r => matchesCondition(r.condition ?? '', value, unit));
    if (!matches.length) { setResult(null); setError('Aucune condition de seuil correspondante n’a été trouvée dans la matrice pour cette valeur. Vérifiez la valeur et l’unité.'); return; }
    setResult(matches[0]); setError('');
  }
  function reset() { setSelected(null); setResult(null); setValue(''); setQuery(''); setError(''); }

  return <div className="space-y-6">
    <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18}/></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>
    <div className="grid grid-cols-3 gap-2 text-xs"><Step n="1" title="Choix de l’activité" active={!selected}/><Step n="2" title="Valeur / seuil" active={!!selected && !result}/><Step n="3" title="Classement & rapports" active={!!result}/></div>

    {!selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><SearchCheck size={18} className="text-emerald-600"/><h2 className="font-semibold">Choisir l’activité</h2></div><Field label="Activité / rubrique" required><input className={inputCls} autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex. élevage de volailles, tannerie, 2121..." /></Field>{query.trim() && suggestions.length > 0 && <div className="mt-4 border rounded-lg divide-y max-h-80 overflow-y-auto">{suggestions.map((s: ActivityCandidate, i) => <div key={`${s.rubrique}-${i}`} className="p-3 flex items-center gap-3"><div className="flex-1"><div className="text-sm font-semibold"><span className="text-emerald-700">{s.rubrique}</span> — {s.designation}</div><div className="text-xs text-gray-500 mt-1">{s.familleLabel}</div></div><button type="button" onClick={() => acceptActivity(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"><Check size={14}/> Accepter</button></div>)}</div>}{query.trim() && suggestions.length === 0 && <div className="mt-4 text-sm text-gray-500">Aucune rubrique trouvée.</div>}</div>}

    {selected && <div className="space-y-5">
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5"><div className="text-xs font-semibold text-emerald-700 uppercase">Activité acceptée</div><div className="text-xl font-bold text-gray-900 mt-1">{selected.rubrique} — {selected.designation}</div><div className="text-sm text-gray-500 mt-1">{selected.familleLabel}</div><button type="button" onClick={reset} className="mt-3 text-xs text-sky-700 hover:underline">Changer l’activité</button></div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><h2 className="font-semibold text-gray-800 mb-4">Donnée nécessaire au classement</h2>{rows.length === 0 ? <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">Aucune condition exploitable n’est disponible pour cette rubrique.</div> : <><div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"><Field label={label} required><input className={inputCls} type="number" min="0" step="any" value={value} onChange={e => { setValue(e.target.value); setResult(null); setError(''); }} placeholder="Saisir la valeur" /></Field><div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 h-10 flex items-center">Unité : <strong className="ml-1">{unit || 'selon la rubrique'}</strong></div><button type="button" onClick={analyse} className="h-10 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">Analyser / Accepter</button></div><p className="text-xs text-gray-500 mt-3">Le système compare automatiquement la valeur saisie aux domaines / seuils de la matrice 07-144.</p></>}</div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>}

      {result && <><div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"><div className="text-sm font-semibold text-emerald-800">Résultat réglementaire</div><div className="text-2xl font-bold text-emerald-950 mt-1">Cette installation est classée en <span className="underline">{category(result.regime)}</span></div><div className="mt-2 text-sm text-emerald-900">Régime : <strong>{regimeLabel(result.regime)}</strong></div><div className="mt-3 text-sm text-emerald-900"><strong>Condition retenue :</strong> {clean(result.condition ?? '')}</div></div><div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-emerald-600"/><h2 className="font-semibold">Rapports / documents nécessaires</h2></div>{documentsFor(result).length ? <div className="grid md:grid-cols-2 gap-3">{documentsFor(result).map(d => <div key={d} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-medium text-emerald-900">✓ {d}</div>)}</div> : <div className="text-sm text-gray-600">Aucun document signalé par la matrice pour cette situation.</div>}<div className="mt-5 pt-4 border-t text-sm text-gray-500">Rayon : <strong>{result.rayon || '—'}</strong> <span className="ml-2 text-xs">(information uniquement)</span></div></div></>}
    </div>}
  </div>;
}
function Step({ n, title, active }: { n: string; title: string; active: boolean }) { return <div className={`rounded-lg border p-2 text-center ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{n}. {title}</div>; }
