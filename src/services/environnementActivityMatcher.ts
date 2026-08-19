export interface ActivityRow {
  rubrique: string;
  famille: string;
  familleLabel: string;
  designation: string;
  conditions?: Array<{ condition?: string; texte?: string; regime: string; meta?: string }>;
  inputProfile?: Array<{ key: string; label: string; type: string; unit: string; required?: boolean; options?: string[] }>;
  source?: string;
  sourceUrl?: string;
}

export interface ActivityMatch {
  row: ActivityRow | null;
  score: number;
  alternatives: ActivityRow[];
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^a-z0-9à-ÿ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'd', 'la', 'le', 'les', 'et', 'en', 'a', 'au', 'aux',
  'pour', 'par', 'sur', 'avec', 'dans', 'ou', 'un', 'une', 'installation',
]);

function tokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

function scoreDesignation(query: string, designation: string): number {
  const q = normalize(query);
  const d = normalize(designation);
  if (!q || !d) return 0;
  if (q === d) return 1000;
  if (d.startsWith(q)) return 900;
  if (d.includes(q)) return 800;

  const qt = [...new Set(tokens(q))];
  const dt = new Set(tokens(d));
  if (!qt.length) return 0;

  let matched = 0;
  let prefixMatched = 0;
  for (const t of qt) {
    if (dt.has(t)) matched += 1;
    else if ([...dt].some(x => x.startsWith(t) || t.startsWith(x))) prefixMatched += 1;
  }

  const coverage = matched / qt.length;
  const prefixCoverage = prefixMatched / qt.length;
  const shortBonus = qt.length === 1 && matched === 1 ? 50 : 0;
  return coverage * 700 + prefixCoverage * 350 + shortBonus;
}

export function findBestActivity(query: string, rows: ActivityRow[]): ActivityMatch {
  const q = normalize(query);
  if (!q) return { row: null, score: 0, alternatives: [] };

  const ranked = rows
    .map(row => ({ row, score: scoreDesignation(q, row.designation) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return { row: null, score: 0, alternatives: [] };

  const best = ranked[0];
  const alternatives = ranked
    .slice(1, 6)
    .filter(x => x.score >= Math.max(250, best.score * 0.72))
    .map(x => x.row);

  return { row: best.row, score: best.score, alternatives };
}

export { normalize as normalizeActivityText };
