import { localDb } from './localDb';
import type {
  Client,
  Dossier,
  DossierWithClient,
  Paiement,
  PaiementWithDossier,
  Expertise,
  ExpertiseWithDossier,
  DocumentRow,
  DocumentWithDossier,
  Laboratoire,
  Parametres,
} from '@/types';
import {
  prefixePourDomaine,
  genererNumeroDossier,
  genererNumeroExpertise,
  genererNumeroEssai,
} from '@/utils/helpers';

// ===== CLIENTS =====
export async function getClients(): Promise<Client[]> {
  const rows = localDb.read<Client>('clients');
  return rows.sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function getClient(id: string): Promise<Client | null> {
  const rows = localDb.read<Client>('clients');
  return rows.find((r) => r.id === id) ?? null;
}

export async function createClient(
  c: Omit<Client, 'id' | 'created_at'>
): Promise<Client> {
  const rows = localDb.read<Client>('clients');
  const row: Client = {
    ...c,
    id: localDb.genId(),
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('clients', rows);
  return row;
}

export async function updateClient(
  id: string,
  c: Partial<Client>
): Promise<Client> {
  const rows = localDb.read<Client>('clients');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Client introuvable');
  rows[idx] = { ...rows[idx], ...c };
  localDb.write('clients', rows);
  return rows[idx];
}

export async function deleteClient(id: string): Promise<void> {
  const rows = localDb.read<Client>('clients');
  localDb.write(
    'clients',
    rows.filter((r) => r.id !== id)
  );
}

// ===== DOSSIERS =====
export async function getDossiers(): Promise<DossierWithClient[]> {
  const rows = localDb.read<Dossier>('dossiers');
  const clients = localDb.read<Client>('clients');
  const withClient = rows.map((d) => ({
    ...d,
    client: clients.find((c) => c.id === d.client_id) ?? null,
  }));
  return withClient.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getDossier(id: string): Promise<DossierWithClient | null> {
  const rows = localDb.read<Dossier>('dossiers');
  const d = rows.find((r) => r.id === id);
  if (!d) return null;
  const clients = localDb.read<Client>('clients');
  return { ...d, client: clients.find((c) => c.id === d.client_id) ?? null };
}

export async function createDossier(
  d: Omit<Dossier, 'id' | 'created_at' | 'numero'> & { numero?: string }
): Promise<Dossier> {
  const rows = localDb.read<Dossier>('dossiers');
  const annee = new Date().getFullYear();
  const prefixe = prefixePourDomaine(d.domaine);

  let index = 1;
  const matching = rows
    .filter((r) => r.numero.startsWith(`${prefixe}-${annee}-`))
    .sort((a, b) => b.numero.localeCompare(a.numero));
  if (matching.length > 0) {
    const parts = matching[0].numero.split('-');
    const lastIdx = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastIdx)) index = lastIdx + 1;
  }

  const numero = genererNumeroDossier(prefixe, annee, index);
  const row: Dossier = {
    ...d,
    id: localDb.genId(),
    numero,
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('dossiers', rows);
  return row;
}

export async function updateDossier(
  id: string,
  d: Partial<Dossier>
): Promise<Dossier> {
  const rows = localDb.read<Dossier>('dossiers');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Dossier introuvable');
  rows[idx] = { ...rows[idx], ...d };
  localDb.write('dossiers', rows);
  return rows[idx];
}

export async function deleteDossier(id: string): Promise<void> {
  const rows = localDb.read<Dossier>('dossiers');
  localDb.write(
    'dossiers',
    rows.filter((r) => r.id !== id)
  );
}

// ===== PAIEMENTS =====
export async function getPaiementsByDossier(
  dossierId: string
): Promise<Paiement[]> {
  const rows = localDb.read<Paiement>('paiements');
  return rows
    .filter((r) => r.dossier_id === dossierId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAllPaiements(): Promise<PaiementWithDossier[]> {
  const rows = localDb.read<Paiement>('paiements');
  const dossiers = localDb.read<Dossier>('dossiers');
  const withDossier = rows.map((p) => ({
    ...p,
    dossier: dossiers.find((d) => d.id === p.dossier_id) ?? null,
  }));
  return withDossier.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function createPaiement(
  p: Omit<Paiement, 'id' | 'created_at'>
): Promise<Paiement> {
  const rows = localDb.read<Paiement>('paiements');
  const row: Paiement = {
    ...p,
    id: localDb.genId(),
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('paiements', rows);
  return row;
}

export async function updatePaiement(
  id: string,
  p: Partial<Paiement>
): Promise<Paiement> {
  const rows = localDb.read<Paiement>('paiements');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Paiement introuvable');
  rows[idx] = { ...rows[idx], ...p };
  localDb.write('paiements', rows);
  return rows[idx];
}

export async function deletePaiement(id: string): Promise<void> {
  const rows = localDb.read<Paiement>('paiements');
  localDb.write(
    'paiements',
    rows.filter((r) => r.id !== id)
  );
}

export async function getTotalPaye(dossierId: string): Promise<number> {
  const rows = localDb.read<Paiement>('paiements');
  return rows
    .filter((r) => r.dossier_id === dossierId)
    .reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
}

// ===== EXPERTISES =====
export async function getExpertises(): Promise<ExpertiseWithDossier[]> {
  const rows = localDb.read<Expertise>('expertises');
  const dossiers = localDb.read<Dossier>('dossiers');
  const withDossier = rows.map((e) => ({
    ...e,
    dossier: dossiers.find((d) => d.id === e.dossier_id) ?? null,
  }));
  return withDossier.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getExpertiseByDossier(
  dossierId: string
): Promise<Expertise | null> {
  const rows = localDb.read<Expertise>('expertises');
  return rows.find((r) => r.dossier_id === dossierId) ?? null;
}

export async function createExpertise(
  e: Omit<Expertise, 'id' | 'created_at' | 'numero'> & { numero?: string }
): Promise<Expertise> {
  const rows = localDb.read<Expertise>('expertises');
  const annee = new Date().getFullYear();

  let index = 1;
  const matching = rows
    .filter((r) => r.numero.startsWith(`EXP-${annee}-`))
    .sort((a, b) => b.numero.localeCompare(a.numero));
  if (matching.length > 0) {
    const parts = matching[0].numero.split('-');
    const lastIdx = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastIdx)) index = lastIdx + 1;
  }

  const numero = genererNumeroExpertise(annee, index);
  const row: Expertise = {
    ...e,
    id: localDb.genId(),
    numero,
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('expertises', rows);
  return row;
}

export async function updateExpertise(
  id: string,
  e: Partial<Expertise>
): Promise<Expertise> {
  const rows = localDb.read<Expertise>('expertises');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Expertise introuvable');
  rows[idx] = { ...rows[idx], ...e };
  localDb.write('expertises', rows);
  return rows[idx];
}

export async function deleteExpertise(id: string): Promise<void> {
  const rows = localDb.read<Expertise>('expertises');
  localDb.write(
    'expertises',
    rows.filter((r) => r.id !== id)
  );
}

// ===== DOCUMENTS =====
export async function getDocumentsByDossier(
  dossierId: string
): Promise<DocumentRow[]> {
  const rows = localDb.read<DocumentRow>('documents');
  return rows
    .filter((r) => r.dossier_id === dossierId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function getAllDocuments(): Promise<DocumentWithDossier[]> {
  const rows = localDb.read<DocumentRow>('documents');
  const dossiers = localDb.read<Dossier>('dossiers');
  const withDossier = rows.map((d) => ({
    ...d,
    dossier: dossiers.find((dd) => dd.id === d.dossier_id) ?? null,
  }));
  return withDossier.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createDocument(
  d: Omit<DocumentRow, 'id' | 'created_at'>
): Promise<DocumentRow> {
  const rows = localDb.read<DocumentRow>('documents');
  const row: DocumentRow = {
    ...d,
    id: localDb.genId(),
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('documents', rows);
  return row;
}

export async function updateDocument(
  id: string,
  d: Partial<DocumentRow>
): Promise<DocumentRow> {
  const rows = localDb.read<DocumentRow>('documents');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Document introuvable');
  rows[idx] = { ...rows[idx], ...d };
  localDb.write('documents', rows);
  return rows[idx];
}

export async function updateDocumentPath(
  id: string,
  localPath: string
): Promise<DocumentRow> {
  const extension = localPath.split('.').pop()?.toLowerCase() ?? '';
  const nomFichier = localPath.split(/[\\/]/).pop() ?? localPath;
  return updateDocument(id, {
    local_path: localPath,
    nom_fichier: nomFichier,
    extension,
    statut: 'NON_VÉRIFIÉ',
  });
}

export async function updateDocumentStatut(
  id: string,
  statut: string
): Promise<void> {
  await updateDocument(id, { statut });
}

export async function deleteDocument(id: string): Promise<void> {
  const rows = localDb.read<DocumentRow>('documents');
  localDb.write(
    'documents',
    rows.filter((r) => r.id !== id)
  );
}

// ===== LABORATOIRE =====
export async function getLaboratoire(): Promise<Laboratoire[]> {
  const rows = localDb.read<Laboratoire>('laboratoire');
  return rows.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createLaboratoire(
  l: Omit<Laboratoire, 'id' | 'created_at' | 'numero_essai'> & {
    numero_essai?: string;
  }
): Promise<Laboratoire> {
  const rows = localDb.read<Laboratoire>('laboratoire');
  const annee = new Date().getFullYear();

  let index = 1;
  const matching = rows
    .filter((r) => r.numero_essai.startsWith(`ESS-${annee}-`))
    .sort((a, b) => b.numero_essai.localeCompare(a.numero_essai));
  if (matching.length > 0) {
    const parts = matching[0].numero_essai.split('-');
    const lastIdx = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastIdx)) index = lastIdx + 1;
  }

  const numero_essai = genererNumeroEssai(annee, index);
  const row: Laboratoire = {
    ...l,
    id: localDb.genId(),
    numero_essai,
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('laboratoire', rows);
  return row;
}

export async function updateLaboratoire(
  id: string,
  l: Partial<Laboratoire>
): Promise<Laboratoire> {
  const rows = localDb.read<Laboratoire>('laboratoire');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Essai introuvable');
  rows[idx] = { ...rows[idx], ...l };
  localDb.write('laboratoire', rows);
  return rows[idx];
}

export async function deleteLaboratoire(id: string): Promise<void> {
  const rows = localDb.read<Laboratoire>('laboratoire');
  localDb.write(
    'laboratoire',
    rows.filter((r) => r.id !== id)
  );
}

// ===== PARAMETRES =====
export async function getParametres(): Promise<Parametres | null> {
  const rows = localDb.read<Parametres>('parametres');
  if (rows.length === 0) return null;
  return rows.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}

export async function updateParametres(
  id: string,
  p: Partial<Parametres>
): Promise<Parametres> {
  const rows = localDb.read<Parametres>('parametres');
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error('Paramètres introuvables');
  rows[idx] = { ...rows[idx], ...p };
  localDb.write('parametres', rows);
  return rows[idx];
}

export async function ensureParametres(): Promise<Parametres> {
  const existing = await getParametres();
  if (existing) return existing;
  const rows = localDb.read<Parametres>('parametres');
  const row: Parametres = {
    id: localDb.genId(),
    nom_bureau: 'URATEC',
    adresse: '',
    telephone: '',
    email: '',
    devise: 'DZD',
    annee_courante: new Date().getFullYear(),
    created_at: localDb.nowISO(),
  };
  rows.push(row);
  localDb.write('parametres', rows);
  return row;
}
