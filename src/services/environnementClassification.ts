export interface ClassificationField {
  key: string;
  label: string;
  unit: string;
  type?: 'number' | 'text';
  required?: boolean;
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

const N = (key: string, label: string, unit: string): ClassificationField => ({ key, label, unit, type: 'number', required: true });

const PROFILES: Record<string, ClassificationProfile> = {
  '2121': {
    fields: [N('animauxEquivalents', 'Nombre d’animaux-équivalents', 'animaux-équivalents')],
    classify: values => {
      const n = Number(values.animauxEquivalents);
      if (!Number.isFinite(n) || n < 0) return null;
      if (n < 5000) return { code: '2121-3', regime: 'D', categorie: '4e catégorie', seuil: 'Moins de 5 000 animaux-équivalents' };
      if (n <= 20000) return { code: '2121-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'De 5 000 à 20 000 animaux-équivalents', rayon: '0,5 km' };
      return { code: '2121-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Plus de 20 000 animaux-équivalents', rayon: '3 km' };
    },
  },
  '2220': {
    fields: [N('puissanceInstallee', 'Puissance installée de l’ensemble des machines fixes', 'kW')],
    classify: values => {
      const p = Number(values.puissanceInstallee);
      if (!Number.isFinite(p) || p < 0) return null;
      if (p <= 40) return { code: '2220-3', regime: 'D', categorie: '4e catégorie', seuil: 'Puissance inférieure ou égale à 40 kW' };
      if (p <= 200) return { code: '2220-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'Puissance supérieure à 40 kW et inférieure ou égale à 200 kW', rayon: '0,5 km' };
      return { code: '2220-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Puissance supérieure à 200 kW', rayon: '2 km' };
    },
  },
  '2126': {
    fields: [N('volumeStockage', 'Volume total de stockage', 'm³')],
    classify: values => {
      const v = Number(values.volumeStockage);
      if (!Number.isFinite(v) || v < 0) return null;
      if (v > 15000) return { code: '2126-1', regime: 'AM', categorie: '1re catégorie', seuil: 'Volume supérieur à 15 000 m³', rayon: '3 km' };
      if (v > 5000) return { code: '2126-2', regime: 'AW', categorie: '2e catégorie', seuil: 'Volume supérieur à 5 000 m³ et inférieur ou égal à 15 000 m³', rayon: '2 km' };
      return null;
    },
  },
  '2724': {
    fields: [N('capaciteTraitement', 'Capacité de traitement', 'm³/j')],
    classify: values => {
      const n = Number(values.capaciteTraitement);
      if (!Number.isFinite(n) || n < 0) return null;
      if (n >= 100000) return { code: '2724-1', regime: 'AM', categorie: '1re catégorie', seuil: 'Capacité ≥ 100 000 m³/j' };
      if (n > 50000) return { code: '2724-2', regime: 'AW', categorie: '2e catégorie', seuil: 'Capacité > 50 000 et < 100 000 m³/j' };
      return { code: '2724-3', regime: 'APAPC', categorie: '3e catégorie', seuil: 'Capacité ≤ 50 000 m³/j' };
    },
  },
  '2324': {
    fields: [N('quantiteTraitee', 'Quantité de matière susceptible d’être traitée', 't/j')],
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

export function getClassificationProfile(rubrique: string, conditionsText = ''): ClassificationProfile | null {
  const direct = PROFILES[rubrique];
  if (direct) return direct;

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
