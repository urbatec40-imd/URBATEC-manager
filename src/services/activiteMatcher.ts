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
  source?: string;
}

const SYNONYMS: Record<string, string[]> = {
  poulet: ['volaille', 'volailles', 'elevage', 'avicole'], poulets: ['volaille', 'volailles', 'elevage', 'avicole'],
  dinde: ['volaille', 'volailles', 'avicole'], canard: ['volaille', 'volailles', 'avicole'],
  ovin: ['ovins', 'mouton', 'moutons', 'elevage', 'animal'], ovins: ['ovin', 'mouton', 'moutons', 'elevage', 'animal'],
  mouton: ['ovin', 'ovins', 'elevage', 'animal'], bovin: ['bovins', 'boeuf', 'elevage', 'animal'], bovins: ['bovin', 'boeuf', 'elevage', 'animal'],
  caprin: ['caprins', 'chevre', 'elevage', 'animal'], caprins: ['caprin', 'chevre', 'elevage', 'animal'],
  poisson: ['peche', 'aquaculture', 'transformation'], poissonnerie: ['poisson', 'peche', 'aquaculture'],
  cuir: ['cuir', 'peaux', 'tannerie', 'megisserie'], cuirs: ['cuir', 'peaux', 'tannerie', 'megisserie'],
  peau: ['cuir', 'peaux', 'tannerie', 'megisserie'], peaux: ['cuir', 'cuirs', 'tannerie', 'megisserie'],
  tannerie: ['cuir', 'cuirs', 'peaux', 'megisserie'], abattoir: ['abattage', 'animaux', 'viandes'], abattage: ['abattoir', 'animaux', 'viandes'],
  peinture: ['peintures', 'vernis', 'enduit', 'colle'], vernis: ['peinture', 'peintures', 'colle', 'enduit'], colle: ['colles', 'peinture', 'vernis', 'enduit'],
  station: ['installation', 'traitement', 'eau', 'eaux'], service: ['station', 'carburants', 'hydrocarbures'],
  carburant: ['carburants', 'essence', 'gasoil', 'gazole', 'hydrocarbure'], carburants: ['carburant', 'essence', 'gasoil', 'gazole', 'hydrocarbure'],
  essence: ['carburant', 'carburants', 'hydrocarbure'], gasoil: ['carburant', 'carburants', 'gazole', 'hydrocarbure'], gaz: ['gpl', 'inflammable', 'stockage'], gpl: ['gaz', 'inflammable', 'stockage'],
  ciment: ['construction', 'materiaux', 'minerais', 'fabrication'], beton: ['béton', 'ciment', 'construction', 'materiaux'],
  briques: ['materiaux', 'fabrication', 'construction'], parpaing: ['materiaux', 'fabrication', 'construction'],
  metal: ['metaux', 'métaux', 'minerais', 'usinage'], metaux: ['metal', 'métaux', 'minerais'], recyclage: ['dechets', 'traitement', 'valorisation'],
  dechet: ['dechets', 'traitement', 'valorisation'], déchets: ['dechets', 'traitement', 'valorisation'], forage: ['eau', 'captage', 'puits'], puits: ['forage', 'eau', 'captage'],
  pharmacie: ['produits pharmaceutiques', 'chimie'], medicament: ['pharmaceutique', 'produits pharmaceutiques', 'chimie']
};

function normalize(value: string): string {
  return value.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`´]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
function tokens(value: string): string[] { return normalize(value).split(' ').filter(Boolean); }
function editDistance(a: string, b: string): number {
  if (a === b) return 0; if (!a) return b.length; if (!b) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = next; }
  return prev[b.length];
}
function expandedTerms(queryTokens: string[]): Set<string> { const set = new Set(queryTokens); for (const token of queryTokens) for (const synonym of SYNONYMS[token] ?? []) set.add(normalize(synonym)); return set; }

function scoreCandidate(queryTokens: string[], normalizedDesignation: string, rowTokens: Set<string>) {
  if (!queryTokens.length) return { score: 0, matched: [] as string[], priority: 0 };
  const expanded = expandedTerms(queryTokens); const matched: string[] = []; let score = 0; let priority = 0;
  const words = normalizedDesignation.split(' ').filter(Boolean);
  const firstWord = words[0] ?? '';
  const firstPhrase = queryTokens.join(' ');
  const designationStartsWithQuery = normalizedDesignation.startsWith(firstPhrase);
  const firstWordStartsWithQuery = firstWord.startsWith(firstPhrase);

  // Recherche naturelle : priorité forte à ce qui commence par la saisie.
  if (designationStartsWithQuery) priority += 1000;
  else if (firstWordStartsWithQuery) priority += 700;
  else if (words.some(word => word.startsWith(firstPhrase))) priority += 350;
  else if (normalizedDesignation.includes(firstPhrase)) priority += 120;

  for (const term of expanded) {
    if (rowTokens.has(term)) { matched.push(term); score += queryTokens.includes(term) ? 5 : 2; continue; }
    for (const candidate of rowTokens) {
      if (term.length >= 2 && candidate.startsWith(term)) { matched.push(term); score += queryTokens.includes(term) ? 3 : 1.5; break; }
      if (term.length >= 5 && term.startsWith(candidate)) { matched.push(term); score += 1; break; }
      if (term.length >= 6 && candidate.length >= 6 && editDistance(term, candidate) <= Math.max(1, Math.floor(Math.min(term.length, candidate.length) * 0.2))) { matched.push(term); score += 1; break; }
    }
  }
  return { score, matched: Array.from(new Set(matched)), priority };
}

export function buildActivityIndex<T extends ActivityRowLike>(rows: T[]) {
  return rows.filter(row => row.designation?.trim()).map(row => ({ row, normalized: normalize(row.designation), tokens: new Set(tokens(row.designation)) }));
}

export function suggestActivities<T extends ActivityRowLike>(index: ReturnType<typeof buildActivityIndex<T>>, description: string, limit = 12): ActivityCandidate[] {
  const raw = description.trim();
  if (!raw) return [];

  const numeric = raw.replace(/\s+/g, '');
  if (/^\d+$/.test(numeric)) {
    return index.filter(item => item.row.rubrique.includes(numeric)).map(item => ({
      rubrique: item.row.rubrique, famille: item.row.famille, familleLabel: item.row.familleLabel,
      designation: item.row.designation, score: item.row.rubrique === numeric ? 100 : 50,
      matchedTerms: [numeric], source: item.row.source ?? 'Nomenclature 07-144'
    })).sort((a, b) => b.score - a.score || a.rubrique.localeCompare(b.rubrique, 'fr', { numeric: true })).slice(0, limit);
  }

  const queryNormalized = normalize(description);
  const queryTokens = tokens(description);
  if (!queryTokens.length) return [];

  const aggregate: ActivityCandidate[] = [];
  for (const item of index) {
    const result = scoreCandidate(queryTokens, item.normalized, item.tokens);
    if (result.score <= 0 && result.priority <= 0) continue;

    // Bonus de correspondance exacte au début + petite récompense pour chaque mot demandé au début d'un mot.
    const exactPhraseBonus = item.normalized.startsWith(queryNormalized) ? 500 : 0;
    const startsWordBonus = queryTokens.every((token, i) => {
      const word = item.normalized.split(' ')[i] ?? '';
      return word.startsWith(token);
    }) ? 180 : 0;

    aggregate.push({
      rubrique: item.row.rubrique,
      famille: item.row.famille,
      familleLabel: item.row.familleLabel,
      designation: item.row.designation,
      score: result.priority + result.score + exactPhraseBonus + startsWordBonus,
      matchedTerms: result.matched,
      source: item.row.source ?? 'Nomenclature 07-144'
    });
  }

  return aggregate
    .sort((a, b) => b.score - a.score || a.designation.localeCompare(b.designation, 'fr'))
    .slice(0, limit);
}
