export interface ActivityCandidate {
  rubrique: string;
  famille: string;
  familleLabel: string;
  designation: string;
  score: number;
  matchedTerms: string[];
  source: string;
}

export interface ActivityRowLike {
  rubrique: string;
  famille: string;
  familleLabel: string;
  designation: string;
  source: string;
}

const SYNONYMS: Record<string, string[]> = {
  minoterie: ['minoteries', 'semoulerie', 'moulin', 'moulins', 'farine', 'farines', 'cereales', 'blutage', 'broyage'],
  minoteries: ['minoterie', 'semoulerie', 'moulin', 'moulins', 'farine', 'farines', 'cereales', 'blutage', 'broyage'],
  semoulerie: ['minoterie', 'minoteries', 'moulin', 'farine', 'cereales', 'blutage', 'broyage'],
  poulet: ['volaille', 'volailles', 'elevage', 'avicole', 'gibier', 'plume'],
  poulets: ['volaille', 'volailles', 'elevage', 'avicole', 'gibier', 'plume'],
  dinde: ['volaille', 'volailles', 'avicole'],
  canard: ['volaille', 'volailles', 'avicole'],
  ovin: ['ovins', 'mouton', 'moutons', 'elevage', 'animal'],
  ovins: ['ovin', 'mouton', 'moutons', 'elevage', 'animal'],
  mouton: ['ovin', 'ovins', 'elevage', 'animal'],
  bovin: ['bovins', 'boeuf', 'elevage', 'animal'],
  bovins: ['bovin', 'boeuf', 'elevage', 'animal'],
  caprin: ['caprins', 'chevre', 'elevage', 'animal'],
  caprins: ['caprin', 'chevre', 'elevage', 'animal'],
  poisson: ['peche', 'aquaculture', 'transformation'],
  poissonnerie: ['poisson', 'peche', 'aquaculture'],
  cuir: ['cuir', 'peaux', 'tannerie', 'megisserie'],
  cuirs: ['cuir', 'peaux', 'tannerie', 'megisserie'],
  peau: ['cuir', 'peaux', 'tannerie', 'megisserie'],
  peaux: ['cuir', 'cuirs', 'tannerie', 'megisserie'],
  tannerie: ['cuir', 'cuirs', 'peaux', 'megisserie'],
  abattoir: ['abattage', 'animaux', 'viandes'],
  abattage: ['abattoir', 'animaux', 'viandes'],
  peinture: ['peintures', 'vernis', 'enduit', 'colle'],
  vernis: ['peinture', 'peintures', 'colle', 'enduit'],
  colle: ['colles', 'peinture', 'vernis', 'enduit'],
  dessalement: ['station', 'eau', 'traitement', 'traitements'],
  epuration: ['station', 'eaux', 'traitement', 'traitements'],
  station: ['installation', 'traitement', 'eau', 'eaux'],
  service: ['station', 'carburants', 'hydrocarbures'],
  carburant: ['carburants', 'essence', 'gasoil', 'gazole', 'hydrocarbure', 'inflammable'],
  carburants: ['carburant', 'essence', 'gasoil', 'gazole', 'hydrocarbure', 'inflammable'],
  essence: ['carburant', 'carburants', 'hydrocarbure', 'inflammable'],
  gasoil: ['carburant', 'carburants', 'gazole', 'hydrocarbure', 'inflammable'],
  gaz: ['gpl', 'gaz', 'inflammable', 'stockage'],
  gpl: ['gaz', 'inflammable', 'stockage'],
  ciment: ['construction', 'materiaux', 'minerais', 'fabrication'],
  beton: ['beton', 'ciment', 'construction', 'materiaux'],
  briques: ['materiaux', 'fabrication', 'construction'],
  parpaing: ['materiaux', 'fabrication', 'construction'],
  metal: ['metaux', 'minerais', 'usinage'],
  metaux: ['metal', 'minerais'],
  recyclage: ['dechets', 'traitement', 'valorisation'],
  dechet: ['dechets', 'traitement', 'valorisation'],
  forage: ['eau', 'captage', 'puits'],
  puits: ['forage', 'eau', 'captage'],
  pharmacie: ['produits pharmaceutiques', 'chimie'],
  medicament: ['pharmaceutique', 'produits pharmaceutiques', 'chimie'],
};

const SEE_RE = /\bvoir\s+([12]\d{3})\b/gi;

function normalize(value: string): string {
  return value
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(' ').filter(Boolean);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        prev[j] + 1,
        next[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev.splice(0, prev.length, ...next);
  }
  return prev[b.length];
}

function expandedTerms(queryTokens: string[]): Set<string> {
  const set = new Set(queryTokens);
  for (const token of queryTokens) {
    for (const synonym of SYNONYMS[token] ?? []) set.add(normalize(synonym));
  }
  return set;
}

function scoreCandidate(queryTokens: string[], rowTokens: Set<string>): { score: number; matched: string[] } {
  if (!queryTokens.length) return { score: 0, matched: [] };
  const expanded = expandedTerms(queryTokens);
  const matched: string[] = [];
  let score = 0;
  for (const term of expanded) {
    if (rowTokens.has(term)) {
      matched.push(term);
      score += queryTokens.includes(term) ? 5 : 2;
      continue;
    }
    for (const candidate of rowTokens) {
      if (term.length >= 5 && (candidate.startsWith(term) || term.startsWith(candidate))) {
        matched.push(term);
        score += 1.5;
        break;
      }
      if (term.length >= 6 && candidate.length >= 6) {
        const distance = editDistance(term, candidate);
        const limit = Math.max(1, Math.floor(Math.min(term.length, candidate.length) * 0.2));
        if (distance <= limit) {
          matched.push(term);
          score += 1;
          break;
        }
      }
    }
  }
  return { score, matched: Array.from(new Set(matched)) };
}

function referencedRubriques(text: string): string[] {
  return Array.from(text.matchAll(SEE_RE), match => match[1]);
}

function isPureCrossReference(text: string): boolean {
  const normalized = normalize(text);
  return /\bvoir\s+[12]\d{3}\b/.test(normalized) &&
    /^(?:.*\bvoir\s+[12]\d{3}\b.*)$/.test(normalized) &&
    !/(fabrication|stockage|transformation|elevage|abattage|installation|production|broyage|conditionnement|traitement)/.test(normalized.replace(/\bvoir\s+[12]\d{3}\b/g, ''));
}

export function buildActivityIndex<T extends ActivityRowLike>(rows: T[]) {
  return rows
    .filter(row => row.designation?.trim())
    .map(row => ({
      row,
      normalized: normalize(row.designation),
      tokens: new Set(tokens(row.designation)),
      references: referencedRubriques(row.designation),
      pureCrossReference: isPureCrossReference(row.designation),
    }));
}

export function suggestActivities<T extends ActivityRowLike>(
  index: ReturnType<typeof buildActivityIndex<T>>,
  description: string,
  limit = 12,
): ActivityCandidate[] {
  const queryTokens = tokens(description);
  if (!queryTokens.length) return [];

  const targetByRubrique = new Map<string, T>();
  for (const item of index) {
    if (!targetByRubrique.has(item.row.rubrique)) targetByRubrique.set(item.row.rubrique, item.row);
  }

  const aggregate = new Map<string, ActivityCandidate>();

  for (const item of index) {
    if (item.pureCrossReference) continue;

    const result = scoreCandidate(queryTokens, item.tokens);
    if (result.score <= 0) continue;

    let score = result.score;
    if (item.normalized.includes(normalize(description))) score += 8;

    // Direct references such as "Minoteries (voir 2220)" should point to 2220.
    const refs = item.references;
    if (refs.length) {
      for (const ref of refs) {
        const target = targetByRubrique.get(ref);
        if (!target) continue;
        const targetTokens = new Set(tokens(target.designation));
        const targetScore = scoreCandidate(queryTokens, targetTokens).score;
        const finalScore = Math.max(score + 4, targetScore + 6);
        const key = target.rubrique + '|' + target.designation;
        const existing = aggregate.get(key);
        const candidate: ActivityCandidate = {
          rubrique: target.rubrique,
          famille: target.famille,
          familleLabel: target.familleLabel,
          designation: target.designation,
          score: finalScore,
          matchedTerms: result.matched,
          source: target.source,
        };
        if (!existing || candidate.score > existing.score) aggregate.set(key, candidate);
      }
      continue;
    }

    const key = item.row.rubrique + '|' + item.row.designation;
    const existing = aggregate.get(key);
    const candidate: ActivityCandidate = {
      rubrique: item.row.rubrique,
      famille: item.row.famille,
      familleLabel: item.row.familleLabel,
      designation: item.row.designation,
      score,
      matchedTerms: result.matched,
      source: item.row.source,
    };
    if (!existing || candidate.score > existing.score) aggregate.set(key, candidate);
  }

  return Array.from(aggregate.values())
    .sort((a, b) => b.score - a.score || a.rubrique.localeCompare(b.rubrique) || a.designation.localeCompare(b.designation, 'fr'))
    .slice(0, limit);
}
