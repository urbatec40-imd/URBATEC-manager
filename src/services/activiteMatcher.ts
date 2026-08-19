import { ACTIVITY_TARGETS, NOMENCLATURE_OVERRIDES } from '@/data/environnementNomenclatureOverrides';

export interface ActivityCandidate { rubrique: string; famille: string; familleLabel: string; designation: string; score: number; matchedTerms: string[]; source: string; selectable?: boolean }
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
function scoreQuery(query: string, queryTokens: string[], rowText: string): { value: number; matched: string[] } {
  const normalizedRow = normalize(rowText);
  const rowTokens = new Set(tokens(normalizedRow));
  const stop = new Set(['de','du','des','la','le','les','et','ou','a','au','aux','en','d','l']);
  const core = queryTokens.filter(t => t.length >= 3 && !stop.has(t));
  const expanded = expandedTerms(core);
  const matched: string[] = [];
  let value = 0;

  if (normalizedRow === query) value += 1000;
  else if (normalizedRow.includes(query)) value += 500;
  else if (query.length >= 8 && normalizedRow.includes(query.slice(0, Math.max(8, Math.floor(query.length * 0.7))))) value += 250;

  for (const term of expanded) {
    if (rowTokens.has(term)) { matched.push(term); value += core.includes(term) ? 30 : 8; continue; }
    for (const candidate of rowTokens) {
      if (term.length >= 5 && (candidate.startsWith(term) || term.startsWith(candidate))) { matched.push(term); value += core.includes(term) ? 10 : 3; break; }
      if (term.length >= 6 && candidate.length >= 6 && editDistance(term, candidate) <= Math.max(1, Math.floor(Math.min(term.length, candidate.length) * 0.15))) { matched.push(term); value += core.includes(term) ? 6 : 2; break; }
    }
  }
  if (core.length > 0) value += (matched.filter(t => core.includes(t)).length / core.length) * 200;
  return { value, matched: Array.from(new Set(matched)) };
}
function referenceContexts(text: string): Array<{ context: string; rubrique: string }> {
  const re = /([^.;:()]{2,180})\(\s*voir\s+([12]\d{3})\s*\)/gi;
  return Array.from(text.matchAll(re), m => ({ context: m[1].trim(), rubrique: m[2] }));
}
export function buildActivityIndex<T extends ActivityRowLike>(rows: T[]) {
  const byRubrique = new Map<string, T>();
  for (const row of [...rows, ...NOMENCLATURE_OVERRIDES as T[]]) if (!byRubrique.has(row.rubrique)) byRubrique.set(row.rubrique, row);
  return Array.from(byRubrique.values()).filter(row => row.designation?.trim()).map(row => ({ row, normalized: normalize(row.designation), tokens: new Set(tokens(row.designation)), selectable: !/^\d{2}00$/.test(row.rubrique) }));
}
function resolveDeterministicTargets(query: string, queryTokens: string[]): string[] {
  const normalizedQuery = normalize(query);
  const targets = new Set<string>();
  for (const [phrase, rubriques] of Object.entries(ACTIVITY_TARGETS)) {
    const normalizedPhrase = normalize(phrase);
    if (normalizedQuery === normalizedPhrase || normalizedQuery.includes(normalizedPhrase)) for (const rubrique of rubriques) targets.add(rubrique);
  }
  for (const token of queryTokens) for (const rubrique of ACTIVITY_TARGETS[token] ?? []) targets.add(rubrique);
  return Array.from(targets);
}
export function suggestActivities<T extends ActivityRowLike>(index: ReturnType<typeof buildActivityIndex<T>>, description: string, limit = 12): ActivityCandidate[] {
  const query = normalize(description);
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];

  // Numeric prefix search is hierarchical: "2" -> all 2xxx rubriques, "21" -> 21xx, "211" -> 211x.
  // Family headings such as 2100/2200 remain visible but are never selectable.
  if (/^\d{1,3}$/.test(query)) {
    const matches = index
      .filter(item => item.row.rubrique.startsWith(query))
      .map(item => ({
        rubrique: item.row.rubrique,
        famille: item.row.famille,
        familleLabel: item.row.familleLabel,
        designation: item.row.designation,
        score: 10000 - item.row.rubrique.length,
        matchedTerms: [query],
        source: item.row.source,
        selectable: item.selectable,
      }));
    return matches.sort((a, b) => a.rubrique.localeCompare(b.rubrique)).slice(0, Math.max(limit, matches.length));
  }

  const rowsByRubrique = new Map(index.map(item => [item.row.rubrique, item.row] as const));
  const aggregate = new Map<string, ActivityCandidate>();
  const deterministicTargets = resolveDeterministicTargets(query, queryTokens);

  for (const item of index) {
    const s = scoreQuery(query, queryTokens, item.row.designation);
    if (s.value < 5) continue;
    const deterministicBoost = deterministicTargets.includes(item.row.rubrique) ? 400 : 0;
    const candidate: ActivityCandidate = { rubrique: item.row.rubrique, famille: item.row.famille, familleLabel: item.row.familleLabel, designation: item.row.designation, score: s.value + deterministicBoost, matchedTerms: s.matched, source: item.row.source, selectable: item.selectable };
    const key = `${item.row.rubrique}|${item.row.designation}`;
    const old = aggregate.get(key); if (!old || candidate.score > old.score) aggregate.set(key, candidate);
  }

  for (const item of index) {
    for (const ref of referenceContexts(item.row.designation)) {
      const s = scoreQuery(query, queryTokens, ref.context);
      if (s.value < 10) continue;
      const target = rowsByRubrique.get(ref.rubrique) ?? NOMENCLATURE_OVERRIDES.find(r => r.rubrique === ref.rubrique);
      if (!target) continue;
      const selectable = !/^\d{2}00$/.test(target.rubrique);
      const candidate: ActivityCandidate = { rubrique: target.rubrique, famille: target.famille, familleLabel: target.familleLabel, designation: target.designation, score: s.value + (deterministicTargets.includes(ref.rubrique) ? 350 : 50), matchedTerms: s.matched, source: target.source, selectable };
      const key = `${target.rubrique}|${target.designation}`; const old = aggregate.get(key); if (!old || candidate.score > old.score) aggregate.set(key, candidate);
    }
  }

  return Array.from(aggregate.values()).sort((a, b) => b.score - a.score || a.rubrique.localeCompare(b.rubrique)).slice(0, limit);
}