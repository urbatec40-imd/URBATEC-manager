export interface Client {
  id: number;
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  nif: string;
  observations: string;
  wilaya: string;
  daïra: string;
  commune: string;
  section: string;
  ilot: string;
}

export interface Dossier {
  id: number;
  numero: string;
  clientId: number;
  clientNom: string;
  telephone: string;
  reference: string;
  domaine: string;
  prestation: string;
  dateReception: string;
  dateLimite: string;
  etatPieces: string;
  piecesManquantes: string;
  prixTotal: number;
  totalPaye: number;
  reste: number;
  pourcentagePaiement: number;
  etapeActuelle: string;
  avancement: number;
  etat: string;
  observations: string;
}

export interface Paiement {
  id: number;
  dossierId: number;
  numeroDossier: string;
  date: string;
  montant: number;
  mode: string;
  reference: string;
  observation: string;
}

export interface Expertise {
  id: number;
  numero: string;
  partie: string;
  dateReception: string;
  delaiAccorde: number;
  dateLimite: string;
  joursRestants: number;
  juridiction: string;
  mission: string;
  avancement: number;
  etat: string;
  observations: string;
  dateDepot: string;
  referenceDossier: string;
}

export interface Document {
  id: number;
  dossierId: number;
  numeroDossier: string;
  type: string;
  nom: string;
  date: string;
  categorie: string;
  observation: string;
  extension: string;
  taille: string;
  cheminLocal: string;
  categorieTechnique: string;
  statut?: string;
}

export interface EssaiLaboratoire {
  id: number;
  numero: string;
  chantier: string;
  typeEssai: string;
  date: string;
  numeroEprouvette: string;
  dateCoulage: string;
  ageJours: number;
  poidsKg: number;
  chargeKn: number;
  resistanceBar: number;
  resultat: string;
  observations: string;
}

export interface Parametres {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  devise: string;
  anneeCourante: number;
  dossierRacine: string;
  categoriesTechniques: string[];
}

// Communes de la Wilaya de Khenchela avec leurs Daïras
export const communesKhenchela: { commune: string; daïra: string }[] = [
  { commune: "Khenchela", daïra: "Khenchela" },
  { commune: "Khenchela Centre", daïra: "Khenchela" },
  { commune: "El Hamma", daïra: "Khenchela" },
  { commune: "Aïn Touila", daïra: "Aïn Touila" },
  { commune: "Ouled Rechache", daïra: "Aïn Touila" },
  { commune: "Babar", daïra: "Babar" },
  { commune: "Chelia", daïra: "Babar" },
  { commune: "Bouhmama", daïra: "Bouhmama" },
  { commune: "M'Sara", daïra: "Bouhmama" },
  { commune: "Yabous", daïra: "Bouhmama" },
  { commune: "Kais", daïra: "Kais" },
  { commune: "Remila", daïra: "Kais" },
  { commune: "Taouzianat", daïra: "Kais" },
  { commune: "El Mahmal", daïra: "El Mahmal" },
  { commune: "Ouled Azzouz", daïra: "El Mahmal" },
  { commune: "Baghaï", daïra: "Baghaï" },
  { commune: "El Faraaouia", daïra: "Baghaï" },
  { commune: "Ensigha", daïra: "Ensigha" },
  { commune: "Tamza", daïra: "Ensigha" },
  { commune: "Aïn El Beïda", daïra: "Aïn El Beïda" },
  { commune: "Khirane", daïra: "Aïn El Beïda" },
];

export const initialData = {
  parametres: {
    nom: "URATEC",
    adresse: "Khenchela, Algérie",
    telephone: "+213 32 00 00 00",
    email: "contact@uratec.dz",
    devise: "DZD",
    anneeCourante: 2026,
    dossierRacine: "C:\\URATEC_DATA\\",
    categoriesTechniques: [
      "PLANS AUTOCAD",
      "DONNÉES TOPOGRAPHIQUES",
      "DONNÉES GLOBAL MAPPER",
      "DONNÉES SIG",
      "POINTS TOPOGRAPHIQUES",
      "LEVÉS TOPOGRAPHIQUES",
      "CALCULS TOPOGRAPHIQUES",
      "ORTHOPHOTOS",
      "IMAGES AÉRIENNES",
      "PLANS",
      "CARTOGRAPHIE",
      "RAPPORTS TECHNIQUES"
    ],
  },
  clients: [
    { id: 1, nom: "SARL Bâtir Plus", telephone: "0550 12 34 56", email: "contact@batirplus.dz", adresse: "Cité 200 Logts, Khenchela", nif: "000123456789", observations: "Client principal - Construction", wilaya: "Khenchela", daïra: "Khenchela", commune: "Khenchela", section: "A", ilot: "12" },
    { id: 2, nom: "M. Ahmed Benali", telephone: "0661 23 45 67", email: "benali.ahmed@gmail.com", adresse: "Rue Emir Abdelkader, Khenchela", nif: "", observations: "Propriétaire terres agricoles", wilaya: "Khenchela", daïra: "Khenchela", commune: "Khenchela", section: "B", ilot: "5" },
    { id: 3, nom: "EPTP Khenchela", telephone: "032 12 34 56", email: "eptp.khenchela@eptp.dz", adresse: "Zone industrielle, Khenchela", nif: "000987654321", observations: "Entreprise publique travaux publics", wilaya: "Khenchela", daïra: "Khenchela", commune: "Khenchela", section: "C", ilot: "8" },
    { id: 4, nom: "Mme Fatima Zohra", telephone: "0770 98 76 54", email: "f.zohra@yahoo.fr", adresse: "Cité 8 Mai 45, Khenchela", nif: "", observations: "Particulière - Régularisation", wilaya: "Khenchela", daïra: "Khenchela", commune: "Khenchela", section: "A", ilot: "3" },
    { id: 5, nom: "SPA AgroSud", telephone: "0555 44 33 22", email: "contact@agrosud.dz", adresse: "Route de Batna, Khenchela", nif: "000555666777", observations: "Société agricole", wilaya: "Khenchela", daïra: "Khenchela", commune: "Khenchela", section: "D", ilot: "15" },
  ],
  dossiers: [
    { id: 1, numero: "TOPO-2026-001", clientId: 1, clientNom: "SARL Bâtir Plus", telephone: "0550 12 34 56", reference: "REF-2026-001", domaine: "Topographie", prestation: "Levé topographique terrain", dateReception: "2026-01-05", dateLimite: "2026-02-15", etatPieces: "Complet", piecesManquantes: "", prixTotal: 150000, totalPaye: 50000, reste: 100000, pourcentagePaiement: 33, etapeActuelle: "Traitement des données", avancement: 60, etat: "EN COURS", observations: "Terrain de 2 hectares" },
    { id: 2, numero: "FA-2026-002", clientId: 2, clientNom: "M. Ahmed Benali", telephone: "0661 23 45 67", reference: "REF-2026-002", domaine: "Foncier agricole", prestation: "Permis de forage de puits", dateReception: "2026-01-10", dateLimite: "2026-02-20", etatPieces: "Incomplet", piecesManquantes: "Acte de propriété, Carte d'identité", prixTotal: 80000, totalPaye: 0, reste: 80000, pourcentagePaiement: 0, etapeActuelle: "Collecte des pièces", avancement: 20, etat: "INCOMPLET", observations: "En attente des pièces du client" },
    { id: 3, numero: "ARCH-2026-003", clientId: 4, clientNom: "Mme Fatima Zohra", telephone: "0770 98 76 54", reference: "REF-2026-003", domaine: "Architecture", prestation: "Régularisation construction", dateReception: "2026-01-15", dateLimite: "2026-03-01", etatPieces: "Complet", piecesManquantes: "", prixTotal: 200000, totalPaye: 100000, reste: 100000, pourcentagePaiement: 50, etapeActuelle: "Dépôt du dossier", avancement: 40, etat: "EN COURS", observations: "Construction R+2" },
    { id: 4, numero: "EXP-2026-004", clientId: 3, clientNom: "EPTP Khenchela", telephone: "032 12 34 56", reference: "REF-2026-004", domaine: "Expertise judiciaire", prestation: "Expertise technique", dateReception: "2026-01-20", dateLimite: "2026-02-10", etatPieces: "Complet", piecesManquantes: "", prixTotal: 300000, totalPaye: 150000, reste: 150000, pourcentagePaiement: 50, etapeActuelle: "Rédaction du rapport", avancement: 75, etat: "EN COURS", observations: "Expertise ordonnée par le tribunal" },
    { id: 5, numero: "LAB-2026-005", clientId: 1, clientNom: "SARL Bâtir Plus", telephone: "0550 12 34 56", reference: "REF-2026-005", domaine: "Laboratoire", prestation: "Essais de compression béton", dateReception: "2026-01-25", dateLimite: "2026-02-05", etatPieces: "Complet", piecesManquantes: "", prixTotal: 50000, totalPaye: 50000, reste: 0, pourcentagePaiement: 100, etapeActuelle: "Rapport final", avancement: 100, etat: "TERMINÉ", observations: "Rapport remis au client" },
    { id: 6, numero: "FU-2026-006", clientId: 5, clientNom: "SPA AgroSud", telephone: "0555 44 33 22", reference: "REF-2026-006", domaine: "Foncier urbain", prestation: "Dossier foncier", dateReception: "2026-02-01", dateLimite: "2026-03-15", etatPieces: "Incomplet", piecesManquantes: "Plan cadastral", prixTotal: 120000, totalPaye: 30000, reste: 90000, pourcentagePaiement: 25, etapeActuelle: "Étude du dossier", avancement: 30, etat: "EN COURS", observations: "En attente du plan cadastral" },
    { id: 7, numero: "ENV-2026-007", clientId: 3, clientNom: "EPTP Khenchela", telephone: "032 12 34 56", reference: "REF-2026-007", domaine: "Environnement", prestation: "Étude environnementale", dateReception: "2026-02-05", dateLimite: "2026-03-20", etatPieces: "Complet", piecesManquantes: "", prixTotal: 250000, totalPaye: 0, reste: 250000, pourcentagePaiement: 0, etapeActuelle: "Démarrage de l'étude", avancement: 10, etat: "NOUVEAU", observations: "Étude d'impact" },
    { id: 8, numero: "TOPO-2026-008", clientId: 2, clientNom: "M. Ahmed Benali", telephone: "0661 23 45 67", reference: "REF-2026-008", domaine: "Topographie", prestation: "Calcul de surfaces", dateReception: "2026-02-08", dateLimite: "2026-02-25", etatPieces: "Complet", piecesManquantes: "", prixTotal: 60000, totalPaye: 60000, reste: 0, pourcentagePaiement: 100, etapeActuelle: "Livraison", avancement: 100, etat: "TERMINÉ", observations: "Travail terminé" },
  ],
  paiements: [
    { id: 1, dossierId: 1, numeroDossier: "TOPO-2026-001", date: "2026-01-10", montant: 50000, mode: "VIREMENT", reference: "VIR-001", observation: "Acompte" },
    { id: 2, dossierId: 3, numeroDossier: "ARCH-2026-003", date: "2026-01-20", montant: 100000, mode: "CHÈQUE", reference: "CHQ-001", observation: "Premier versement" },
    { id: 3, dossierId: 4, numeroDossier: "EXP-2026-004", date: "2026-01-25", montant: 150000, mode: "VIREMENT", reference: "VIR-002", observation: "Acompte expertise" },
    { id: 4, dossierId: 5, numeroDossier: "LAB-2026-005", date: "2026-01-30", montant: 50000, mode: "ESPÈCES", reference: "ESP-001", observation: "Paiement complet" },
    { id: 5, dossierId: 6, numeroDossier: "FU-2026-006", date: "2026-02-05", montant: 30000, mode: "VIREMENT", reference: "VIR-003", observation: "Acompte" },
    { id: 6, dossierId: 8, numeroDossier: "TOPO-2026-008", date: "2026-02-10", montant: 60000, mode: "ESPÈCES", reference: "ESP-002", observation: "Paiement complet" },
  ],
  expertises: [
    { id: 1, numero: "EXP-2026-001", partie: "M. Karim Meziane", dateReception: "2026-01-15", delaiAccorde: 30, dateLimite: "2026-02-14", joursRestants: 5, juridiction: "Tribunal de Khenchela — Section foncière", mission: "Expertise foncière - bornage", avancement: 70, etat: "EN COURS", observations: "Mission en cours", dateDepot: "", referenceDossier: "EXP-2026-004" },
    { id: 2, numero: "EXP-2026-002", partie: "SPA AgroSud", dateReception: "2026-01-20", delaiAccorde: 45, dateLimite: "2026-03-06", joursRestants: 25, juridiction: "Tribunal administratif", mission: "Expertise technique - litige construction", avancement: 30, etat: "EN COURS", observations: "En attente des documents", dateDepot: "", referenceDossier: "FU-2026-006" },
  ],
  documents: [
    { id: 1, dossierId: 1, numeroDossier: "TOPO-2026-001", type: "PDF", nom: "plan_topographique.pdf", date: "2026-01-15", categorie: "03_PLANS", observation: "Plan topographique final", extension: "PDF", taille: "2.5 MB", cheminLocal: "C:\\URATEC_DATA\\2026\\TOPO-2026-001\\03_PLANS\\plan_topographique.pdf", categorieTechnique: "PLANS AUTOCAD", statut: "ENREGISTRÉ" },
    { id: 2, dossierId: 2, numeroDossier: "FA-2026-002", type: "JPG", nom: "photo_terrain.jpg", date: "2026-01-20", categorie: "04_PHOTOS", observation: "Photo du terrain", extension: "JPG", taille: "1.2 MB", cheminLocal: "C:\\URATEC_DATA\\2026\\FA-2026-002\\04_PHOTOS\\photo_terrain.jpg", categorieTechnique: "PHOTOS CHANTIER", statut: "ENREGISTRÉ" },
    { id: 3, dossierId: 3, numeroDossier: "ARCH-2026-003", type: "DWG", nom: "plans_architecte.dwg", date: "2026-01-25", categorie: "03_PLANS", observation: "Plans architecte", extension: "DWG", taille: "5.8 MB", cheminLocal: "C:\\URATEC_DATA\\2026\\ARCH-2026-003\\03_PLANS\\plans_architecte.dwg", categorieTechnique: "PLANS AUTOCAD", statut: "ENREGISTRÉ" },
    { id: 4, dossierId: 4, numeroDossier: "EXP-2026-004", type: "DOCX", nom: "rapport_expertise.docx", date: "2026-02-01", categorie: "05_RAPPORTS", observation: "Rapport d'expertise", extension: "DOCX", taille: "850 KB", cheminLocal: "C:\\URATEC_DATA\\2026\\EXP-2026-004\\05_RAPPORTS\\rapport_expertise.docx", categorieTechnique: "RAPPORTS TECHNIQUES", statut: "ENREGISTRÉ" },
    { id: 5, dossierId: 5, numeroDossier: "LAB-2026-005", type: "XLSX", nom: "resultats_essais.xlsx", date: "2026-02-05", categorie: "05_RAPPORTS", observation: "Résultats des essais", extension: "XLSX", taille: "450 KB", cheminLocal: "C:\\URATEC_DATA\\2026\\LAB-2026-005\\05_RAPPORTS\\resultats_essais.xlsx", categorieTechnique: "RAPPORTS TECHNIQUES", statut: "ENREGISTRÉ" },
  ],
  laboratoire: [
    { id: 1, numero: "LAB-2026-001", chantier: "Construction R+2 - Khenchela", typeEssai: "Compression béton", date: "2026-01-25", numeroEprouvette: "EP-001", dateCoulage: "2026-01-18", ageJours: 7, poidsKg: 8.2, chargeKn: 250, resistanceBar: 31.2, resultat: "Conforme", observations: "Béton C25/30" },
    { id: 2, numero: "LAB-2026-002", chantier: "Construction R+2 - Khenchela", typeEssai: "Compression béton", date: "2026-01-25", numeroEprouvette: "EP-002", dateCoulage: "2026-01-18", ageJours: 7, poidsKg: 8.1, chargeKn: 245, resistanceBar: 30.5, resultat: "Conforme", observations: "Béton C25/30" },
    { id: 3, numero: "LAB-2026-003", chantier: "Route Wilaya 12", typeEssai: "Compression béton", date: "2026-02-01", numeroEprouvette: "EP-003", dateCoulage: "2026-01-25", ageJours: 7, poidsKg: 8.3, chargeKn: 230, resistanceBar: 28.7, resultat: "À surveiller", observations: "Résistance légèrement faible" },
  ],
};