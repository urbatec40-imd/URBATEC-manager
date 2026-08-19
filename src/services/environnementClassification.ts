export interface ClassificationField {
  key: string;
  label: string;
  unit: string;
  type?: 'number' | 'text';
  required?: boolean;
  helper?: string;
}

export interface ClassificationResult {
  code: string;
  regime: string;
  categorie?: string;
  seuil: string;
  rayon?: string;
}

export interface ClassificationProfile {
  fields: ClassificationField[];
  classify: (values: Record<string, string>) => ClassificationResult | null;
}

interface ParsedRange {
  min?: number;
  minInclusive?: boolean;
  max?: number;
  maxInclusive?: boolean;
  unit: string;
  label: string;
  raw: string;
  regime: string;
  index: number;
}

const N = (key: string, label: string, unit: string, helper?: string): ClassificationField => ({ key, label, unit, type: 'number', required: true, helper });

const PROFILES: Record<string, ClassificationProfile> = {
  '2121': {
    fields: [N('animauxEquivalents', 'Nombre d’animaux-équivalents', 'animaux-équivalents', 'Moins de 5 000 · De 5 000 à 20 000 · Plus de 20 000')],
    classify: values => {
      const n = Number(values.animauxEquivalents);
      if (!Number.isFinite(n) || n < 0) return null;
      if (n < 5000) return { code: '2121-3', regime: 'D', categorie: '4e catégorie', seuil: 'Moins de 5 000 animaux-équivalents' };
      if (n <= 20000) return { code: '2121-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'De 5 000 à 20 000 animaux-équivalents', rayon: '0,5 km' };
      return { code: '2121-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Plus de 20 000 animaux-équivalents', rayon: '3 km' };
    },
  },
  '2220': {
    fields: [N('puissanceInstallee', 'Puissance installée de l’ensemble des machines fixes', 'kW', '≤ 40 kW · > 40 et ≤ 200 kW · > 200 kW')],
    classify: values => {
      const p = Number(values.puissanceInstallee);
      if (!Number.isFinite(p) || p < 0) return null;
      if (p <= 40) return { code: '2220-3', regime: 'D', categorie: '4e catégorie', seuil: 'Puissance inférieure ou égale à 40 kW' };
      if (p <= 200) return { code: '2220-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'Puissance supérieure à 40 kW et inférieure ou égale à 200 kW', rayon: '0,5 km' };
      return { code: '2220-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Puissance supérieure à 200 kW', rayon: '2 km' };
    },
  },
  '2126': {
    fields: [N('volumeStockage', 'Volume total de stockage', 'm³', '≤ 5 000 m³ · > 5 000 et ≤ 15 000 m³ · > 15 000 m³')],
    classify: values => {
      const v = Number(values.volumeStockage);
      if (!Number.isFinite(v) || v < 0) return null;
      if (v > 15000) return { code: '2126-1', regime: 'AM', categorie: '1re catégorie', seuil: 'Volume supérieur à 15 000 m³', rayon: '3 km' };
      if (v > 5000) return { code: '2126-2', regime: 'AW', categorie: '2e catégorie', seuil: 'Volume supérieur à 5 000 m³ et inférieur ou égal à 15 000 m³', rayon: '2 km' };
      return null;
    },
  },
  '2724': {
    fields: [N('capaciteTraitement', 'Capacité de traitement', 'm³/j', '≤ 50 000 m³/j · > 50 000 et < 100 000 m³/j · ≥ 100 000 m³/j')],
    classify: values => {
      const n = Number(values.capaciteTraitement);
      if (!Number.isFinite(n) || n < 0) return null;
      if (n >= 100000) return { code: '2724-1', regime: 'AM', categorie: '1re catégorie', seuil: 'Capacité ≥ 100 000 m³/j' };
      if (n > 50000) return { code: '2724-2', regime: 'AW', categorie: '2e catégorie', seuil: 'Capacité > 50 000 et < 100 000 m³/j' };
      return { code: '2724-3', regime: 'APAPC', categorie: '3e catégorie', seuil: 'Capacité ≤ 50 000 m³/j' };
    },
  },
  '2324': {
    fields: [N('quantiteTraitee', 'Quantité de matière susceptible d’être traitée', 't/j', '< 1 t/j · ≥ 1 et < 10 t/j · ≥ 10 t/j')],
    classify: values => {
      const q = Number(values.quantiteTraitee);
      if (!Number.isFinite(q) || q < 0) return null;
      if (q >= 10) return { code: '2324-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Quantité ≥ 10 t/j' };
      if (q >= 1) return { code: '2324-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'Quantité ≥ 1 t/j et < 10 t/j' };
      return { code: '2324-3', regime: 'D', categorie: '4e catégorie', seuil: 'Quantité < 1 t/j' };
    },
  },
  '1534': {
    fields: [N('debitEquivalent', 'Débit maximum équivalent de l’installation', 'm³/h')],
    classify: values => {
      const d = Number(values.debitEquivalent);
      if (!Number.isFinite(d) || d < 0) return null;
      return null;
    },
  },
};

function normalizeNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function inferUnit(text: string): string {
  const t = text.toLocaleLowerCase('fr-FR');
  if (/animaux-?équivalents|animaux équivalents/.test(t)) return 'animaux-équivalents';
  if (/m\s*³\s*\/\s*j|m3\s*\/\s*j|mètres? cubes?.*jour/.test(t)) return 'm³/j';
  if (/m\s*³|m3|mètres? cubes?/.test(t)) return 'm³';
  if (/kg\s*\/\s*j|kilogrammes?.*jour/.test(t)) return 'kg/j';
  if (/t\s*\/\s*j|tonnes?.*jour/.test(t)) return 't/j';
  if (/k\s*w\b/.test(t)) return 'kW';
  if (/l\s*\/\s*j|litres?.*jour/.test(t)) return 'l/j';
  if (/kg\b|kilogrammes?\b/.test(t)) return 'kg';
  if (/t\b|tonnes?\b/.test(t)) return 't';
  return '';
}

function prettifyRange(min?: number, minInclusive?: boolean, max?: number, maxInclusive?: boolean, unit = ''): string {
  const f = (n: number) => n.toLocaleString('fr-FR');
  const suffix = unit ? ` ${unit}` : '';
  if (min !== undefined && max !== undefined) return `${minInclusive ? '≥' : '>'} ${f(min)}${suffix} et ${maxInclusive ? '≤' : '<'} ${f(max)}${suffix}`;
  if (min !== undefined) return `${minInclusive ? '≥' : '>'} ${f(min)}${suffix}`;
  if (max !== undefined) return `${maxInclusive ? '≤' : '<'} ${f(max)}${suffix}`;
  return '';
}

function parseRangesFromText(text: string, regime: string, index: number): ParsedRange[] {
  const source = text.replace(/\u00a0/g, ' ');
  const unit = inferUnit(source);
  const ranges: ParsedRange[] = [];
  const seen = new Set<string>();
  const push = (r: ParsedRange) => { const key = `${r.min}|${r.minInclusive}|${r.max}|${r.maxInclusive}|${r.unit}|${r.regime}`; if (!seen.has(key)) { seen.add(key); ranges.push(r); } };

  const rangeRe = /(?:de|entre)\s+([\d\s.,]+)\s+(?:à|et)\s+([\d\s.,]+)(?:\s+([^.;:,\n]+))?/gi;
  for (const m of source.matchAll(rangeRe)) {
    const a = normalizeNumber(m[1]); const b = normalizeNumber(m[2]);
    if (a === null || b === null) continue;
    const u = inferUnit(`${m[0]} ${m[3] ?? ''}`) || unit;
    const label = prettifyRange(a, true, b, true, u);
    push({ min: a, minInclusive: true, max: b, maxInclusive: true, unit: u, label, raw: m[0].trim(), regime, index });
  }

  const geLeRe = /(supérieure? ou égale(?: à)?|plus de|supérieure? à|inférieure? ou égale(?: à)?|moins de|inférieure? à)\s*([\d\s.,]+)(?:\s*([^.;:,\n]+))?/gi;
  for (const m of source.matchAll(geLeRe)) {
    const n = normalizeNumber(m[2]); if (n === null) continue;
    const op = m[1].toLocaleLowerCase('fr-FR');
    const u = inferUnit(`${m[0]} ${m[3] ?? ''}`) || unit;
    const isLower = /supérieure|plus de/.test(op);
    const inclusive = /ou égale/.test(op);
    const label = prettifyRange(isLower ? n : undefined, inclusive, isLower ? undefined : n, inclusive, u);
    push({ min: isLower ? n : undefined, minInclusive: isLower ? inclusive : undefined, max: isLower ? undefined : n, maxInclusive: isLower ? undefined : inclusive, unit: u, label, raw: m[0].trim(), regime, index });
  }

  return ranges;
}

function buildThresholdProfile(rubrique: string, conditionsText: string, conditions?: Array<{ regime: string; condition?: string; texte?: string; meta?: string }>): ClassificationProfile | null {
  if (!conditions?.length) return null;
  const ranges = conditions.flatMap((c, i) => parseRangesFromText(`${c.condition ?? ''} ${c.texte ?? ''} ${c.meta ?? ''}`, c.regime, i));
  if (!ranges.length) return null;
  const units = Array.from(new Set(ranges.map(r => r.unit).filter(Boolean)));
  if (units.length !== 1) return null;
  const unit = units[0];
  const key = `valeurClassement_${rubrique}`;
  const helper = ranges.map(r => r.label).filter(Boolean).join(' · ');
  return {
    fields: [N(key, `Valeur de classement — Rubrique ${rubrique}`, unit, helper)],
    classify: values => {
      const value = Number(values[key]);
      if (!Number.isFinite(value) || value < 0) return null;
      const matched = ranges.find(r => (r.min === undefined || (r.minInclusive ? value >= r.min : value > r.min)) && (r.max === undefined || (r.maxInclusive ? value <= r.max : value < r.max)));
      if (!matched) return null;
      return { code: `${rubrique}-${matched.index + 1}`, regime: matched.regime, seuil: matched.label };
    },
  };
}

export function getClassificationProfile(
  rubrique: string,
  conditionsText = '',
  conditions?: Array<{ regime: string; condition?: string; texte?: string; meta?: string }>,
): ClassificationProfile | null {
  const direct = PROFILES[rubrique];
  if (direct) return direct;

  const threshold = buildThresholdProfile(rubrique, conditionsText, conditions);
  if (threshold) return threshold;

  const t = conditionsText.toLocaleLowerCase('fr-FR');
  if (/animaux|animaux-équivalents/.test(t)) return { fields: [N('animauxEquivalents', 'Nombre d’animaux-équivalents', 'animaux-équivalents')], classify: () => null };
  if (/puissance.*kw|puissance install/.test(t)) return { fields: [N('puissanceInstallee', 'Puissance installée', 'kW')], classify: () => null };
  if (/volume.*m.?3|stockage.*m.?3/.test(t)) return { fields: [N('volume', 'Volume', 'm³')], classify: () => null };
  if (/t\/j|tonnes?\s*\/\s*jour|tonnes par jour/.test(t)) return { fields: [N('quantite', 'Quantité / capacité', 't/j')], classify: () => null };
  if (/m.?3\/j|mètres cubes.*jour/.test(t)) return { fields: [N('debit', 'Capacité / débit', 'm³/j')], classify: () => null };
  if (/kg\/j|kilogrammes?\s*\/\s*jour/.test(t)) return { fields: [N('quantite', 'Quantité / capacité', 'kg/j')], classify: () => null };
  if (/kw/.test(t)) return { fields: [N('puissance', 'Puissance', 'kW')], classify: () => null };
  return null;
}

export function extractRequirementHints(text: string) {
  const source = text || '';
  const lower = source.toLocaleLowerCase('fr-FR');
  const docs = {
    impact: /étude\s+d['’]?impact/.test(lower),
    danger: /étude\s+de\s+dangers?/.test(lower),
    notice: /notice\s+d['’]?impact/.test(lower),
    rapportDangereux: /rapport\s+sur\s+les\s+produits\s+dangereux/.test(lower),
  };
  const rayon = source.match(/(?:rayon|d['’]?affichage)\D{0,20}(\d+(?:[,.]\d+)?)\s*km/i)?.[1];
  return { docs, rayon: rayon ? `${rayon.replace(',', '.')} km` : undefined };
}
