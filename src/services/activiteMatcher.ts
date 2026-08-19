import { ACTIVITY_TARGETS, NOMENCLATURE_OVERRIDES } from '@/data/environnementNomenclatureOverrides';

export interface ActivityCandidate { rubrique: string; famille: string; familleLabel: string; designation: string; score: number; matchedTerms: string[]; source: string }
export interface ActivityRowLike { rubrique: string; famille: string; familleLabel: string; designation: string; source: string }

const SYNONYMS: Record<string, string[]> = {
  minoterie: ['minoteries', 'semoulerie', 'moulin', 'moulins', 'farine', 'farines', 'cereales', 'blutage', 'broyage'],
  minoteries: ['minoterie', 'semoulerie', 'moulin', 'farine', 'farines', 'cereales', 'blutage', 'broyage'],
  semoulerie: ['minoterie', 'minoteries', 'moulin', 'farine', 'cereales', 'blutage', 'broyage'],
  poulet: ['volaille', 'volailles', 'elevage', 'avicole'], poulets: ['volaille', 'volailles', 'elevage', 'avicole'],
  ovin: ['ovins', 'mouton', 'elevage'], ovins: ['ovin', 'mouton', 'elevage'], mouton: ['ovin', 'ovins', 'elevage'],
  bovin: ['bovins', 'boeuf', 'elevage'], bovins: ['bovin', 'boeuf', 'elevage'],
  tannerie: ['cuir', 'cuirs', 'peaux', 'megisserie'], cuir: ['cuirs', 'peaux', 'tannerie', 'megisserie'], peaux: ['cuir', 'tannerie', 'megisserie'],
  dessalement: ['station', 'eau', 'traitement'], station: ['installation', 'traitement', 'eau'],
  carburant: ['carburants', 'essence', 'gasoil', 'gazole', 'hydrocarbure'], carburants: ['carburant', 'essence', 'gasoil', 'gazole', 'hydrocarbure'],
  essence: ['carburant', 'hydrocarbure'], gasoil: ['carburant', 'gazole', 'hydrocarbure'], gazole: ['carburant', 'hydrocarbure'], gpl: ['gaz', 'inflammable'],
  recyclage: ['dechets', 'traitement', 'valorisation'], dechet: ['dechets', 'traitement', 'valorisation'], forage: ['eau', 'captage', 'puits'], puits: ['forage', 'eau'],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`´]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
function tokens(value: string): string[] { return normalize(value).split(' ').filter(Boolean); }

function editDistance(a: string, b: string): number {
  if (a === b) return 0; if (!a) return b.length; if (!b) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev.splice(0, prev.length, ...next); }
  return prev[b.length];
}

function expandedTerms(queryTokens: string[]): Set<string> {
  const out = new Set(queryTokens);
  for (const token of queryTokens) for (const synonym of SYNONYMS[token] ?? []) out.add(normalize(synonym));
  return out;
}

function score(queryTokens: string[], rowText: string): { value: number; matched: string[] } {
  const rowTokens = new Set(tokens(rowText)); const expanded = expandedTerms(queryTokens); const matched: string[] = []; let value = 0;
  for (const term of expanded) {
    if (rowTokens.has(term)) { matched.push(term); value += queryTokens.includes(term) ? 5 : 2; continue; }
    for (const candidate of rowTokens) {
      if (term.length >= 5 && (candidate.startsWith(term) || term.startsWith(candidate))) { matched.push(term); value += 1.5; break; }
      if (term.length >= 6 && candidate.length >= 6 && editDistance(term, candidate) <= Math.max(1, Math.floor(Math.min(term.length, candidate.length) * 0.2))) { matched.push(term); value += 1; break; }
    }
  }
  return { value, matched: Array.from(new Set(matched)) };
}

function referenceContexts(text: string): Array<{ context: string; rubrique: string }> {
  const re = /([^.;:()]{2,140})\(\s*voir\s+([12]\d{3})\s*\)/gi;
  return Array.from(text.matchAll(re), m => ({ context: m[1].trim(), rubrique: m[2] }));
}

export function buildActivityIndex<T extends ActivityRowLike>(rows: T[]) {
  const byRubrique = new Map<string, T>();
  for (const row of [...rows, ...NOMENCLATURE_OVERRIDES as T[]]) if (!byRubrique.has(row.rubrique)) byRubrique.set(row.rubrique, row);
  return Array.from(byRubrique.values()).filter(row => row.designation?.trim()).map(row => ({ row, normalized: normalize(row.designation), tokens: new Set(tokens(row.designation)) }));
}

function resolveDeterministicTargets(query: string, queryTokens: string[]): string[] {
  const normalizedQuery = normalize(query);
  const targets = new Set<string>();

  for (const [phrase, rubriques] of Object.entries(ACTIVITY_TARGETS)) {
    const normalizedPhrase = normalize(phrase);
    const hit = normalizedQuery === normalizedPhrase || normalizedQuery.includes(normalizedPhrase) || normalizedPhrase.includes(normalizedQuery);
    if (hit) for (const rubrique of rubriques) targets.add(rubrique);
  }

  for (const token of queryTokens) {
    for (const rubrique of ACTIVITY_TARGETS[token] ?? []) targets.add(rubrique);
  }

  return Array.from(targets);
}

export function suggestActivities<T extends ActivityRowLike>(index: ReturnType<typeof buildActivityIndex<T>>, description: string, limit = 12): ActivityCandidate[] {
  const query = normalize(description); const queryTokens = tokens(query); if (!queryTokens.length) return [];
  const rowsByRubrique = new Map(index.map(item => [item.row.rubrique, item.row] as const));
  const aggregate = new Map<string, ActivityCandidate>();
  const deterministicTargets = resolveDeterministicTargets(query, queryTokens);

  // 1) Deterministic legal aliases are authoritative when available.
  for (const rubrique of deterministicTargets) {
    const row = rowsByRubrique.get(rubrique);
    if (!row) continue;
    aggregate.set(`${rubrique}|${row.designation}`, {
      rubrique,
      famille: row.famille,
      familleLabel: row.familleLabel,
      designation: row.designation,
      score: 100,
      matchedTerms: queryTokens,
      source: row.source,
    });
  }

  // 2) Cross-reference phrases from the extracted Nomenclature can reinforce or resolve a target.
  for (const item of index) {
    for (const ref of referenceContexts(item.row.designation)) {
      const s = score(queryTokens, ref.context);
      if (s.value <= 0) continue;
      if (deterministicTargets.length > 0 && !deterministicTargets.includes(ref.rubrique)) continue;

      const target = rowsByRubrique.get(ref.rubrique) ?? NOMENCLATURE_OVERRIDES.find(r => r.rubrique === ref.rubrique);
      if (!target) continue;
      const candidate: ActivityCandidate = {
        rubrique: target.rubrique,
        famille: target.famille,
        familleLabel: target.familleLabel,
        designation: target.designation,
        score: (deterministicTargets.includes(ref.rubrique) ? 105 : 80) + s.value,
        matchedTerms: s.matched,
        source: target.source,
      };
      const key = `${target.rubrique}|${target.designation}`;
      const old = aggregate.get(key);
      if (!old || candidate.score > old.score) aggregate.set(key, candidate);
    }
  }

  // 3) Only use fuzzy matching when no authoritative target was found.
  if (deterministicTargets.length === 0) {
    for (const item of index) {
      const s = score(queryTokens, item.row.designation); if (s.value <= 0) continue;
      const exact = item.normalized.includes(query) ? 8 : 0;
      const candidate: ActivityCandidate = { rubrique: item.row.rubrique, famille: item.row.famille, familleLabel: item.row.familleLabel, designation: item.row.designation, score: s.value + exact, matchedTerms: s.matched, source: item.row.source };
      const key = `${item.row.rubrique}|${item.row.designation}`; const old = aggregate.get(key); if (!old || candidate.score > old.score) aggregate.set(key, candidate);
    }
  }

  return Array.from(aggregate.values()).sort((a, b) => b.score - a.score || a.rubrique.localeCompare(b.rubrique)).slice(0, limit);
}
