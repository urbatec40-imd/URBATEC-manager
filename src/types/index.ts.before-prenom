// ===== TYPES MODÈLES URATEC MANAGER =====

export type Domaine =
  | 'Architecture'
  | 'Topographie'
  | 'Laboratoire géotechnique'
  | 'Foncier agricole'
  | 'Environnement'
  | 'Expertise judiciaire';

export const DOMAINES: Domaine[] = [
  'Architecture',
  'Topographie',
  'Laboratoire géotechnique',
  'Foncier agricole',
  'Environnement',
  'Expertise judiciaire',
];

export const PRESTATIONS_PAR_DOMAINE: Record<Domaine, string[]> = {
  Architecture: [
    "Certificat d'urbanisme",
    'Permis de lotir',
    'Certificat de morcellement',
    'Permis de construire',
    'Certificat de conformité',
    'Permis de démolir',
    'Mise en conformité / Loi 08-15',
    'Plans libres',
    'Autre',
  ],
  Topographie: [
    'Levé topographique',
    'Implantation',
    'Calcul de cubature',
    'Plan de situation',
    'Plan parcellaire',
    'Autre',
  ],
  'Laboratoire géotechnique': [
    'Étude géotechnique / Étude de sol',
    'Essais géotechniques',
    'Essais sur béton',
    'Essais sur matériaux de construction',
    'Rapport d\'essais – Norme 17004',
    'Contrôle de qualité des matériaux',
    'Contrôle de qualité des travaux',
    'Suivi de travaux d\'aménagement et de routes',
    'Carottage',
    'Attachement',
    'Rapport de laboratoire',
    'Autre',
  ],
  'Foncier agricole': [
    'Instruction 4300',
    'Demande de forage',
    'Régularisation foncière agricole',
    'Autre',
  ],
  Environnement: [
    "Déclaration d'exploitation – PAPC",
    "Notice d'impact sur l'environnement",
    "Étude d'impact sur l'environnement",
    'Étude de danger',
    'Rapport sur les produits dangereux',
    "Dossier d'autorisation d'exploitation",
    'Audit environnemental',
    'Mise en conformité environnementale',
    'Autre',
  ],
  'Expertise judiciaire': [
    'Expertise judiciaire',
    'Expertise libre',
    'Autre',
  ],
};

export type TypeJuridiction =
  | 'Juridiction judiciaire'
  | 'Juridiction administrative'
  | "Conseil d'État";

export const TYPES_JURIDICTION: TypeJuridiction[] = [
  'Juridiction judiciaire',
  'Juridiction administrative',
  "Conseil d'État",
];

export const TRIBUNAUX_JUDICIAIRE: Record<string, string[]> = {
  'Tribunal de Khenchela': ['Annexe Aïn Touila'],
  'Tribunal de Chechar': [],
  'Tribunal de Kaïs': [],
  "Tribunal d'Ouled Rechache": ['Annexe Babar'],
  'Tribunal de Bouhmama': [],
};

export type DossierEtat =
  | 'NOUVEAU'
  | 'EN COURS'
  | 'INCOMPLET'
  | 'EN ATTENTE'
  | 'TERMINÉ'
  | 'ANNULÉ';

export const DOSSIER_ETATS: DossierEtat[] = [
  'NOUVEAU',
  'EN COURS',
  'INCOMPLET',
  'EN ATTENTE',
  'TERMINÉ',
  'ANNULÉ',
];

export type EtatPieces = 'Complet' | 'Incomplet' | 'Manquant';

export const ETAT_PIECES: EtatPieces[] = ['Complet', 'Incomplet', 'Manquant'];

export type ModePaiement = 'ESPÈCES' | 'VIREMENT' | 'CHÈQUE' | 'AUTRE';

export const MODES_PAIEMENT: ModePaiement[] = [
  'ESPÈCES',
  'VIREMENT',
  'CHÈQUE',
  'AUTRE',
];

export type DocumentCategorie =
  | '01_PIECES_CLIENT'
  | '02_RELEVES'
  | '03_PLANS'
  | '04_PHOTOS'
  | '05_RAPPORTS'
  | '06_DOCUMENTS_FINAUX'
  | 'PLANS AUTOCAD'
  | 'DONNÉES TOPOGRAPHIQUES'
  | 'DONNÉES GLOBAL MAPPER'
  | 'DONNÉES SIG'
  | 'POINTS TOPOGRAPHIQUES'
  | 'LEVÉS TOPOGRAPHIQUES'
  | 'CALCULS TOPOGRAPHIQUES'
  | 'ORTHOPHOTOS'
  | 'IMAGES AÉRIENNES'
  | 'CARTOGRAPHIE'
  | 'RAPPORTS TECHNIQUES';

export const DOCUMENT_CATEGORIES: DocumentCategorie[] = [
  '01_PIECES_CLIENT',
  '02_RELEVES',
  '03_PLANS',
  '04_PHOTOS',
  '05_RAPPORTS',
  '06_DOCUMENTS_FINAUX',
  'PLANS AUTOCAD',
  'DONNÉES TOPOGRAPHIQUES',
  'DONNÉES GLOBAL MAPPER',
  'DONNÉES SIG',
  'POINTS TOPOGRAPHIQUES',
  'LEVÉS TOPOGRAPHIQUES',
  'CALCULS TOPOGRAPHIQUES',
  'ORTHOPHOTOS',
  'IMAGES AÉRIENNES',
  'CARTOGRAPHIE',
  'RAPPORTS TECHNIQUES',
];

export type DocumentStatut = 'DISPONIBLE' | 'INTROUVABLE' | 'NON_VÉRIFIÉ';

export const DOCUMENT_STATUTS: DocumentStatut[] = [
  'DISPONIBLE',
  'INTROUVABLE',
  'NON_VÉRIFIÉ',
];

// Extensions de fichiers supportées
export const FILE_EXTENSIONS = [
  // Documents généraux
  'pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx',
  // AutoCAD
  'dwg', 'dxf', 'dws', 'dwt',
  // Global Mapper / SIG
  'gmap', 'gmw', 'gmp', 'gml', 'kml', 'kmz', 'shp', 'prj', 'dbf', 'shx', 'tab', 'mif', 'mid',
  // Topographie
  'csv', 'txt', 'xyz', 'asc', 'pts', 'job', 'jxl', 'xml', 'raw', 'dat',
];

export function isExtensionValide(ext: string): boolean {
  return FILE_EXTENSIONS.includes(ext.toLowerCase());
}

export type EcheanceStatut =
  | 'EN RETARD'
  | 'ÉCHÉANCE PROCHE'
  | 'DANS LES DÉLAIS'
  | 'TERMINÉ'
  | '—';

export interface Client {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  numeroCarteIdentite: string | null;
  dateDelivranceCarteIdentite: string | null;
  nin: string | null;
  autoriteDelivranceCarteIdentite: string | null;
  observations: string | null;
  wilaya: string | null;
  daira: string | null;
  commune: string | null;
  created_at: string;
}

export interface Dossier {
  id: string;
  numero: string;
  client_id: string | null;
  telephone: string | null;
  reference: string | null;
  domaine: string;
  prestation: string;
  date_reception: string;
  date_limite: string | null;
  etat_pieces: string | null;
  pieces_manquantes: string | null;
  prix_total: number;
  etape_actuelle: string | null;
  avancement: number;
  etat: string;
  observations: string | null;
  type_juridiction: string | null;
  juridiction: string | null;
  prestation_autre: string | null;
  created_at: string;
}

export interface DossierWithClient extends Dossier {
  client?: Client | null;
}

export interface Paiement {
  id: string;
  dossier_id: string;
  date: string;
  montant: number;
  mode_paiement: string;
  reference: string | null;
  observation: string | null;
  created_at: string;
}

export interface PaiementWithDossier extends Paiement {
  dossier?: Dossier | null;
}

export interface Expertise {
  id: string;
  numero: string;
  dossier_id: string | null;
  partie_demandeur: string | null;
  date_reception: string | null;
  delai_accorde: string | null;
  date_limite: string | null;
  juridiction: string | null;
  nature_mission: string | null;
  avancement: number;
  etat: string;
  observations: string | null;
  date_depot_rapport: string | null;
  created_at: string;
}

export interface ExpertiseWithDossier extends Expertise {
  dossier?: Dossier | null;
}

export interface DocumentRow {
  id: string;
  dossier_id: string;
  nom_fichier: string;
  categorie: string;
  chemin_stockage: string | null;
  extension: string;
  local_path: string;
  statut: string;
  taille: number;
  type_mime: string | null;
  observation: string | null;
  created_at: string;
}

export interface DocumentWithDossier extends DocumentRow {
  dossier?: Dossier | null;
}

export interface Laboratoire {
  id: string;
  numero_essai: string;
  chantier: string | null;
  type_essai: string | null;
  date: string | null;
  numero_eprouvette: string | null;
  date_coulage: string | null;
  age_jours: number | null;
  poids_kg: number | null;
  charge_kn: number | null;
  resistance_bar: number | null;
  resultat: string | null;
  observations: string | null;
  created_at: string;
}

export interface Parametres {
  id: string;
  nom_bureau: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  devise: string;
  annee_courante: number;
  created_at: string;
}

// ===== Types de prestation (legacy — kept for backward compat) =====
export type TypePrestation = string;

// ===== Wilaya de Khenchela — Communes et Daïras =====
// 8 daïras, 21 communes
export const COMMUNES_DAIRAS: Record<string, string> = {
  'Aïn Touila': 'Aïn Touila',
  'M\'Toussa': 'Aïn Touila',
  'Babar': 'Babar',
  'Baghai': 'El Hamma',
  'Bouhmama': 'Bouhmama',
  'Chechar': 'Chechar',
  'Chelia': 'Bouhmama',
  'Djellal': 'Chechar',
  'El Hamma': 'El Hamma',
  'El Mahmal': 'Ouled Rechache',
  'El Oueldja': 'Chechar',
  'Ensigha': 'El Hamma',
  'Kaïs': 'Kaïs',
  'Khenchela': 'Khenchela',
  'Khirane': 'Chechar',
  'M\'Sara': 'Bouhmama',
  'Ouled Rechache': 'Ouled Rechache',
  'Remila': 'Kaïs',
  'Tamza': 'El Hamma',
  'Taouzient': 'Kaïs',
  'Yabous': 'Bouhmama',
};

export const COMMUNES_KHENCHELA = Object.keys(COMMUNES_DAIRAS).sort();

export function dairaPourCommune(commune: string): string {
  return COMMUNES_DAIRAS[commune] ?? '';
}

// ===== Préfixes de numérotation =====
export const DOMAINE_PREFIXES: Record<string, string> = {
  'Foncier agricole': 'FA',
  Topographie: 'TOPO',
  Architecture: 'ARCH',
  Environnement: 'ENV',
  'Laboratoire géotechnique': 'LAB',
  'Expertise judiciaire': 'EXP',
};

export const JURIDICTIONS = [
  'Tribunal de Khenchela',
  'Tribunal de Chechar',
  'Tribunal de Kaïs',
  "Tribunal d'Ouled Rechache",
  'Tribunal de Bouhmama',
  'Tribunal administratif',
  "Conseil d'État",
];

// ===== Authentification locale =====
export type UserRole = 'Administrateur' | 'Utilisateur';

export interface User {
  id: string;
  username: string;
  nom_complet: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface Session {
  user_id: string;
  username: string;
  nom_complet: string;
  role: UserRole;
}

