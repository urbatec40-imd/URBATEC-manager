export interface RegulatoryField {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  unit: string;
  required?: boolean;
  options?: string[];
}

const FIELD_RULES: Array<{
  re: RegExp;
  field: RegulatoryField;
}> = [
  { re: /animaux[\s-]*[eé]quivalents|nombre\s+d['’]animaux|capacit[ée]\s+d['’]élevage|élevage[^.]{0,80}animaux/i, field: { key: 'nombreAnimaux', label: "Nombre d’animaux équivalents", type: 'number', unit: 'animaux-équivalents', required: true } },
  { re: /puissance\s+install[ée]e|puissance[^.]{0,50}\b(?:kw|mw|kva)\b/i, field: { key: 'puissance', label: 'Puissance installée', type: 'number', unit: 'kW', required: true } },
  { re: /capacit[ée]\s+de\s+production|production\s+[^.]{0,40}(?:kg\/j|t\/j|tonne\/j|hl\/an|l\/j)/i, field: { key: 'capaciteProduction', label: 'Capacité de production / traitement', type: 'number', unit: 'selon rubrique', required: true } },
  { re: /volume\s+total\s+de\s+stockage|volume[^.]{0,50}\b(?:m3|m³)\b|stockage[^.]{0,80}\b(?:m3|m³)\b/i, field: { key: 'volumeStockage', label: 'Volume total de stockage', type: 'number', unit: 'm³', required: true } },
  { re: /débit\s+(?:maximum|maximal|total)|débit[^.]{0,50}\b(?:m3\/h|m³\/h|l\/h|l\/min)\b/i, field: { key: 'debit', label: 'Débit maximal', type: 'number', unit: 'selon rubrique', required: true } },
  { re: /consommation\s+d['’]eau|consommation\s+annuelle\s+d['’]eau|eau[^.]{0,50}\b(?:m3\/an|m³\/an|l\/j|m3\/j|m³\/j)\b/i, field: { key: 'consommationEau', label: 'Consommation d’eau', type: 'number', unit: 'selon rubrique' } },
  { re: /temp[ée]rature\s+d['’]utilisation|temp[ée]rature\s+(?:de|d['’])[^.]{0,30}\b°C\b/i, field: { key: 'temperature', label: 'Température', type: 'number', unit: '°C' } },
  { re: /pression\s+(?:absolue|de\s+service|maximale)|pression[^.]{0,40}\b(?:bar|Pa|mbar)\b/i, field: { key: 'pression', label: 'Pression', type: 'number', unit: 'selon rubrique' } },
  { re: /surface\s+(?:totale|de\s+l['’]installation)|superficie|surface[^.]{0,40}\bm2\b|surface[^.]{0,40}\bm²\b/i, field: { key: 'surface', label: 'Surface', type: 'number', unit: 'm²' } },
  { re: /quantit[ée]\s+totale\s+susceptible|quantit[ée]\s+totale\s+emmagasin[ée]|quantit[ée]\s+stock[ée]|quantit[ée][^.]{0,50}\b(?:kg|t|l|m3|m³)\b/i, field: { key: 'quantite', label: 'Quantité', type: 'number', unit: 'selon rubrique' } },
];

export function inferRegulatoryFields(designation: string): RegulatoryField[] {
  const fields: RegulatoryField[] = [];
  for (const rule of FIELD_RULES) {
    if (!rule.re.test(designation)) continue;
    if (fields.some(field => field.key === rule.field.key)) continue;
    fields.push({ ...rule.field });
  }
  return fields;
}

export function mergeRegulatoryFields(
  existing: RegulatoryField[] | undefined,
  designation: string,
): RegulatoryField[] {
  const inferred = inferRegulatoryFields(designation);
  const result = [...(existing ?? [])];
  for (const field of inferred) {
    const current = result.find(item => item.key === field.key);
    if (!current) result.push(field);
  }
  return result;
}

export function describeRequiredData(designation: string): string {
  const fields = inferRegulatoryFields(designation);
  if (!fields.length) return 'Les conditions de la rubrique détermineront les données à renseigner.';
  return fields.map(field => `${field.label} (${field.unit})`).join(' · ');
}
