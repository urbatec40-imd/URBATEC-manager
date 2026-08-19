export type RegimeEnvironnement = 'D' | 'APAPC' | 'AW';

export interface ClassementEnvironnement {
  code: string;
  rubrique: string;
  designation: string;
  regime: RegimeEnvironnement;
  categorie: '4e catégorie' | '3e catégorie' | '2e catégorie' | '1re catégorie';
  seuil: string;
  animauxEquivalents: number;
  documentsIndiques: string[];
  reference: string;
  sourceUrl: string;
  verification: 'Source officielle - à valider avant dépôt';
}

const SOURCE_07144 =
  'https://www.me.gov.dz/wp-content/uploads/2022/05/Decret-executif-07-144.pdf';

/**
 * Référence réglementaire de base: Décret exécutif n°07-144 du 19 mai 2007,
 * rubrique 2121 (volailles, gibier à plume).
 * Les poules, poulets, faisans et pintades comptent pour 1 animal-équivalent;
 * canards = 2; dindes et oies = 3.
 */
export function classerVolaille(
  type: string,
  nombre: number
): ClassementEnvironnement | null {
  const t = type.toLowerCase();
  const reconnu =
    t.includes('poule') ||
    t.includes('poulet') ||
    t.includes('faisan') ||
    t.includes('pintade') ||
    t.includes('canard') ||
    t.includes('dinde') ||
    t.includes('oie');

  if (!reconnu || !Number.isFinite(nombre) || nombre <= 0) return null;

  let multiplicateur = 1;
  if (t.includes('canard')) multiplicateur = 2;
  if (t.includes('dinde') || t.includes('oie')) multiplicateur = 3;

  const ae = nombre * multiplicateur;

  if (ae < 5000) {
    return {
      code: '2121-3',
      rubrique: '2121',
      designation: 'Volailles, gibier à plume (élevage, vente, etc...)',
      regime: 'D',
      categorie: '4e catégorie',
      seuil: 'Moins de 5 000 animaux-équivalents',
      animauxEquivalents: ae,
      documentsIndiques: [],
      reference: 'Décret exécutif n° 07-144 du 19 mai 2007 — rubrique 2121-3',
      sourceUrl: SOURCE_07144,
      verification: 'Source officielle - à valider avant dépôt',
    };
  }

  if (ae <= 20000) {
    return {
      code: '2121-2',
      rubrique: '2121',
      designation: 'Volailles, gibier à plume (élevage, vente, etc...)',
      regime: 'APAPC',
      categorie: '3e catégorie',
      seuil: 'De 5 000 à 20 000 animaux-équivalents',
      animauxEquivalents: ae,
      documentsIndiques: ['EIE', 'ED'],
      reference: 'Décret exécutif n° 07-144 du 19 mai 2007 — rubrique 2121-2',
      sourceUrl: SOURCE_07144,
      verification: 'Source officielle - à valider avant dépôt',
    };
  }

  return {
    code: '2121-1',
    rubrique: '2121',
    designation: 'Volailles, gibier à plume (élevage, vente, etc...)',
    regime: 'AW',
    categorie: '2e catégorie',
    seuil: 'Plus de 20 000 animaux-équivalents',
    animauxEquivalents: ae,
    documentsIndiques: ['EIE', 'ED'],
    reference: 'Décret exécutif n° 07-144 du 19 mai 2007 — rubrique 2121-1',
    sourceUrl: SOURCE_07144,
    verification: 'Source officielle - à valider avant dépôt',
  };
}

export const DOCUMENT_LEGEND = {
  EIE: "Étude d'impact sur l'environnement",
  ED: 'Étude de danger',
  NI: "Notice d'impact sur l'environnement",
  RPD: 'Rapport sur les produits dangereux',
} as const;
