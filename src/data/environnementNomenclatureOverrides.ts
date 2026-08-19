import type { ActivityRowLike } from '@/services/activiteMatcher';

export const NOMENCLATURE_OVERRIDES: ActivityRowLike[] = [
  { rubrique: '2121', famille: '2100', familleLabel: 'Élevage d’animaux & Activité agricole', designation: 'Volailles, gibier à plume (Elevage, vente, etc..., de), à l’exclusion d’activités spécifiques visées par d’autres rubriques', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '2126', famille: '2100', familleLabel: 'Élevage d’animaux & Activité agricole', designation: 'Silos et installations de stockage de céréales, grains, produits alimentaires ou tout produit organique dégageant des poussières inflammables', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '2220', famille: '2200', familleLabel: 'Agro alimentaires', designation: 'Broyage, concassage, criblage, déchiquetage, ensachage, pulvérisation, trituration, nettoyage, tamisage, blutage, mélange, épluchage et décortication des substances végétales et de tous produits organiques naturels, à l’exclusion des activités visées par les rubriques 2214, 2215, 2216 et 2229 mais y compris la fabrication d’aliments pour le bétail', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '1530', famille: '1500', familleLabel: 'Inflammables', designation: 'Liquides inflammables', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '1534', famille: '1500', familleLabel: 'Inflammables', designation: 'Liquides inflammables (installations de remplissage ou de distribution)', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '1513', famille: '1500', familleLabel: 'Inflammables', designation: 'Gaz inflammables liquéfiés (stockage en réservoirs manufacturés) et installations de remplissage ou de distribution', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '1220', famille: '1200', familleLabel: 'Toxiques', designation: 'Ammoniac (fabrication industrielle, emploi ou stockage) et anhydride sulfureux', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '1269', famille: '1200', familleLabel: 'Toxiques', designation: 'Substances et préparations toxiques particulières (stockage, emploi, fabrication industrielle, formulation et conditionnement)', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '2724', famille: '2700', familleLabel: 'Déchets et traitements des eaux', designation: 'Station de dessalement d’eau de mer', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '2324', famille: '2300', familleLabel: 'Textiles, Cuirs et Peaux', designation: 'Tanneries, mégisseries et toute opération de préparation des cuirs et peaux', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
  { rubrique: '2922', famille: '2900', familleLabel: 'Divers', designation: 'Chauffage (procédés de) utilisant comme fluide caloporteur des corps organiques combustibles', source: 'Décret exécutif n° 07-144 du 19 mai 2007' },
];

export const ACTIVITY_TARGETS: Record<string, string[]> = {
  minoterie: ['2220'], minoteries: ['2220'], semoulerie: ['2220'], moulin: ['2220'], moulins: ['2220'],
  farine: ['2220'], farines: ['2220'], blutage: ['2220'], 'broyage cereales': ['2220'], 'graines et cereales': ['2220'],
  'stockage cereales': ['2126'], 'stockage grains': ['2126'], silo: ['2126'], silos: ['2126'],
  poulet: ['2121'], poulets: ['2121'], volaille: ['2121'], volailles: ['2121'], avicole: ['2121'],
  tannerie: ['2324'], mégisserie: ['2324'], megisserie: ['2324'], cuir: ['2324'], cuirs: ['2324'], peaux: ['2324'],
  dessalement: ['2724'], 'station dessalement': ['2724'],
  'station service': ['1534', '1530', '1513'], 'station-service': ['1534', '1530', '1513'],
  carburant: ['1534', '1530'], carburants: ['1534', '1530'], essence: ['1530', '1534'], gasoil: ['1530', '1534'], gazole: ['1530', '1534'], gpl: ['1513'],
};
