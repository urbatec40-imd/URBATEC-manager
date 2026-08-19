export interface MatchableActivity {
  rubrique: string;
  famille: string;
  familleLabel: string;
  designation: string;
  [key: string]: unknown;
}

const ALIASES: Record<string, string[]> = {
  poulet: ['poulet', 'poulets', 'volaille', 'volailles', 'elevage de volailles', 'avicole', 'aviculture', 'دجاج', 'دواجن', 'تربية الدجاج'],
  ovin: ['ovin', 'ovins', 'mouton', 'moutons', 'sheep', 'agneau', 'agneaux', 'غنم', 'اغنام', 'أغنام', 'خروف', 'خرفان', 'تربية الاغنام', 'تربية الأغنام'],
  bovin: ['bovin', 'bovins', 'vache', 'vaches', 'veau', 'veaux', 'cattle', 'cow', 'بقر', 'ابقار', 'أبقار', 'عجل', 'تربية الابقار', 'تربية الأبقار'],
  caprin: ['caprin', 'caprins', 'chèvre', 'chevre', 'chèvres', 'goat', 'goats', 'ماعز', 'معز', 'تربية الماعز'],
  elevage: ['elevage', 'élevage', 'ferme', 'animaux', 'animal', 'تربية', 'تربية حيوانات', 'تربية الحيوانات'],
  abattoir: ['abattoir', 'abattage', 'slaughterhouse', 'مذبح', 'ذبح', 'مسالخ', 'مسلخ'],
  tannerie: ['tannerie', 'tanneries', 'megisserie', 'mégisserie', 'cuir', 'cuirs', 'peau', 'peaux', 'دباغة', 'جلود', 'الجلود'],
  dessalement: ['dessalement', 'desalinisation', 'desalination', 'station de dessalement', 'تحلية', 'محطة تحلية', 'تحلية مياه البحر'],
  station: ['station', 'station de traitement', 'station epuration', 'station d’épuration', 'station depuration', 'محطة'],
  peinture: ['peinture', 'vernis', 'apprêt', 'appret', 'colle', 'enduit', 'paint', 'vernice', 'دهان', 'طلاء', 'ورنيش'],
  dechet: ['déchet', 'dechet', 'déchets', 'dechets', 'waste', 'نفايات', 'مفرغة', 'مركز معالجة النفايات'],
  eau: ['eau', 'eaux', 'water', 'مياه', 'المياه'],
  agro: ['agroalimentaire', 'agro alimentaire', 'alimentaire', 'abattage', 'viande', 'viandes', 'غذائي', 'صناعات غذائية'],
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019`']/g, ' ')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string) {
  return normalize(value).split(' ').filter(Boolean);
}

function expandQuery(query: string) {
  const q = normalize(query);
  const words = new Set(tokens(q));
  for (const [key, aliases] of Object.entries(ALIASES)) {
    const normalizedAliases = aliases.map(normalize);
    if (normalizedAliases.some(a => a === q || a.includes(q) || q.includes(a))) {
      words.add(key);
      normalizedAliases.flatMap(tokens).forEach(word => words.add(word));
    }
  }
  return Array.from(words);
}

function scoreActivity(query: string, row: MatchableActivity) {
  const q = normalize(query);
  if (!q) return 0;

  const designation = normalize(row.designation);
  const family = normalize(row.familleLabel);
  const queryTokens = expandQuery(q);
  const designationTokens = tokens(designation);
  const familyTokens = tokens(family);

  let score = 0;
  if (designation === q) score += 1000;
  if (designation.includes(q)) score += 500;
  if (family.includes(q)) score += 100;

  for (const token of queryTokens) {
    if (designationTokens.includes(token)) score += 30;
    else if (designation.includes(token)) score += 12;
    if (familyTokens.includes(token)) score += 8;
  }

  for (const [key, aliases] of Object.entries(ALIASES)) {
    const hit = aliases.some(alias => {
      const a = normalize(alias);
      return q === a || q.includes(a) || a.includes(q);
    });
    if (hit && (designation.includes(key) || designationTokens.some(t => t.startsWith(key)))) {
      score += 250;
    }
  }

  return score;
}

export function suggestActivities<T extends MatchableActivity>(query: string, rows: T[], limit = 10) {
  const q = normalize(query);
  if (!q) return [] as (T & { matchScore: number })[];

  return rows
    .map(row => ({ ...row, matchScore: scoreActivity(q, row) }))
    .filter(row => row.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.designation.localeCompare(b.designation, 'fr'))
    .filter((row, index, arr) => arr.findIndex(x => normalize(x.designation) === normalize(row.designation)) === index)
    .slice(0, limit);
}
