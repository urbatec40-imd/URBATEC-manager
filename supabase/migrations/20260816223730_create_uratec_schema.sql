/*
# URATEC MANAGER — Schéma de base de données V0

Crée toutes les tables nécessaires pour la gestion interne d'un bureau d'études multidisciplinaire algérien.

## 1. Tables créées

### clients
- `id` (uuid, PK) — identifiant unique du client
- `nom` (text) — nom ou raison sociale
- `telephone` (text) — numéro de téléphone
- `email` (text) — adresse email
- `adresse` (text) — adresse postale
- `nif_rc` (text) — NIF / RC (identifiant fiscal)
- `observations` (text) — notes libres
- `created_at` (timestamptz)

### dossiers
- `id` (uuid, PK)
- `numero` (text, unique) — numéro de dossier auto-généré (ex: TOPO-2026-001)
- `client_id` (uuid, FK → clients.id)
- `telephone` (text) — téléphone de contact pour le dossier
- `reference` (text) — référence interne
- `domaine` (text) — domaine d'activité (Foncier agricole, Topographie, etc.)
- `prestation` (text) — type de prestation
- `date_reception` (date) — date de réception du dossier
- `date_limite` (date) — date limite / échéance
- `etat_pieces` (text) — état des pièces (Complet, Incomplet, Manquant)
- `pieces_manquantes` (text) — description des pièces manquantes
- `prix_total` (numeric) — prix total du dossier en DZD
- `etape_actuelle` (text) — étape actuelle du traitement
- `avancement` (int) — pourcentage d'avancement (0-100)
- `etat` (text) — statut du dossier (NOUVEAU, EN COURS, INCOMPLET, EN ATTENTE, TERMINÉ, ANNULÉ)
- `observations` (text) — observations libres
- `created_at` (timestamptz)

### paiements
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers.id)
- `date` (date) — date du paiement
- `montant` (numeric) — montant payé en DZD
- `mode_paiement` (text) — ESPÈCES, VIREMENT, CHÈQUE, AUTRE
- `reference` (text) — référence du paiement
- `observation` (text) — observation libre
- `created_at` (timestamptz)

### expertises
- `id` (uuid, PK)
- `numero` (text, unique) — numéro d'expertise (ex: EXP-2026-001)
- `dossier_id` (uuid, FK → dossiers.id, nullable) — lien optionnel vers un dossier
- `partie_demandeur` (text) — partie / demandeur
- `date_reception` (date) — date de réception
- `delai_accorde` (text) — délai accordé (libre)
- `date_limite` (date) — date limite
- `juridiction` (text) — juridiction / autorité
- `nature_mission` (text) — nature / mission
- `avancement` (int) — pourcentage d'avancement (0-100)
- `etat` (text) — état
- `observations` (text)
- `date_depot_rapport` (date) — date de dépôt du rapport
- `created_at` (timestamptz)

### documents
- `id` (uuid, PK)
- `dossier_id` (uuid, FK → dossiers.id)
- `nom_fichier` (text) — nom du fichier
- `categorie` (text) — catégorie (01_PIECES_CLIENT, etc.)
- `chemin_stockage` (text) — chemin dans le bucket Supabase Storage
- `taille` (bigint) — taille en octets
- `type_mime` (text) — type MIME
- `observation` (text)
- `created_at` (timestamptz)

### laboratoire
- `id` (uuid, PK)
- `numero_essai` (text, unique) — numéro d'essai
- `chantier` (text) — nom du chantier
- `type_essai` (text) — type d'essai
- `date` (date) — date de l'essai
- `numero_eprouvette` (text) — numéro d'éprouvette
- `date_coulage` (date) — date de coulage
- `age_jours` (int) — âge en jours
- `poids_kg` (numeric) — poids en kg
- `charge_kn` (numeric) — charge en kN
- `resistance_bar` (numeric) — résistance en bar
- `resultat` (text) — résultat / conclusion
- `observations` (text)
- `created_at` (timestamptz)

### parametres
- `id` (uuid, PK)
- `nom_bureau` (text) — nom du bureau (URATEC)
- `adresse` (text)
- `telephone` (text)
- `email` (text)
- `devise` (text) — DZD
- `annee_courante` (int) — année courante
- `created_at` (timestamptz)

## 2. Relations
- Un client → plusieurs dossiers (FK dossiers.client_id)
- Un dossier → plusieurs paiements (FK paiements.dossier_id)
- Un dossier → plusieurs documents (FK documents.dossier_id)
- Un dossier → une expertise optionnelle (FK expertises.dossier_id)

## 3. Sécurité (RLS)
- Application interne sans authentification (V0) — politiques `TO anon, authenticated` sur toutes les tables.
- Toutes les tables activent RLS.
- CRUD complet autorisé pour anon + authenticated (données partagées internes).

## 4. Notes importantes
1. Les numéros de dossier et d'expertise sont générés côté application avec vérification d'unicité.
2. Les montants sont stockés en numeric pour permettre les calculs financiers précis.
3. Le bucket de stockage pour les documents doit être créé séparément (Supabase Storage).
*/

-- ===== CLIENTS =====
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  telephone text,
  email text,
  adresse text,
  nif_rc text,
  observations text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE TO anon, authenticated USING (true);

-- ===== DOSSIERS =====
CREATE TABLE IF NOT EXISTS dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  telephone text,
  reference text,
  domaine text NOT NULL,
  prestation text NOT NULL,
  date_reception date NOT NULL,
  date_limite date,
  etat_pieces text DEFAULT 'Complet',
  pieces_manquantes text,
  prix_total numeric DEFAULT 0,
  etape_actuelle text,
  avancement int NOT NULL DEFAULT 0 CHECK (avancement >= 0 AND avancement <= 100),
  etat text NOT NULL DEFAULT 'NOUVEAU',
  observations text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dossiers" ON dossiers;
CREATE POLICY "anon_select_dossiers" ON dossiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dossiers" ON dossiers;
CREATE POLICY "anon_insert_dossiers" ON dossiers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dossiers" ON dossiers;
CREATE POLICY "anon_update_dossiers" ON dossiers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dossiers" ON dossiers;
CREATE POLICY "anon_delete_dossiers" ON dossiers FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_dossiers_client_id ON dossiers(client_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_domaine ON dossiers(domaine);
CREATE INDEX IF NOT EXISTS idx_dossiers_etat ON dossiers(etat);

-- ===== PAIEMENTS =====
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  montant numeric NOT NULL DEFAULT 0,
  mode_paiement text NOT NULL DEFAULT 'ESPÈCES',
  reference text,
  observation text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_paiements" ON paiements;
CREATE POLICY "anon_select_paiements" ON paiements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paiements" ON paiements;
CREATE POLICY "anon_insert_paiements" ON paiements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paiements" ON paiements;
CREATE POLICY "anon_update_paiements" ON paiements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paiements" ON paiements;
CREATE POLICY "anon_delete_paiements" ON paiements FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_paiements_dossier_id ON paiements(dossier_id);

-- ===== EXPERTISES =====
CREATE TABLE IF NOT EXISTS expertises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  dossier_id uuid REFERENCES dossiers(id) ON DELETE SET NULL,
  partie_demandeur text,
  date_reception date,
  delai_accorde text,
  date_limite date,
  juridiction text,
  nature_mission text,
  avancement int NOT NULL DEFAULT 0 CHECK (avancement >= 0 AND avancement <= 100),
  etat text NOT NULL DEFAULT 'NOUVEAU',
  observations text,
  date_depot_rapport date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expertises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_expertises" ON expertises;
CREATE POLICY "anon_select_expertises" ON expertises FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_expertises" ON expertises;
CREATE POLICY "anon_insert_expertises" ON expertises FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_expertises" ON expertises;
CREATE POLICY "anon_update_expertises" ON expertises FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_expertises" ON expertises;
CREATE POLICY "anon_delete_expertises" ON expertises FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_expertises_dossier_id ON expertises(dossier_id);

-- ===== DOCUMENTS =====
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  nom_fichier text NOT NULL,
  categorie text NOT NULL,
  chemin_stockage text,
  taille bigint DEFAULT 0,
  type_mime text,
  observation text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_documents_dossier_id ON documents(dossier_id);

-- ===== LABORATOIRE =====
CREATE TABLE IF NOT EXISTS laboratoire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_essai text UNIQUE NOT NULL,
  chantier text,
  type_essai text,
  date date,
  numero_eprouvette text,
  date_coulage date,
  age_jours int,
  poids_kg numeric,
  charge_kn numeric,
  resistance_bar numeric,
  resultat text,
  observations text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE laboratoire ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_laboratoire" ON laboratoire;
CREATE POLICY "anon_select_laboratoire" ON laboratoire FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_laboratoire" ON laboratoire;
CREATE POLICY "anon_insert_laboratoire" ON laboratoire FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_laboratoire" ON laboratoire;
CREATE POLICY "anon_update_laboratoire" ON laboratoire FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_laboratoire" ON laboratoire;
CREATE POLICY "anon_delete_laboratoire" ON laboratoire FOR DELETE TO anon, authenticated USING (true);

-- ===== PARAMETRES =====
CREATE TABLE IF NOT EXISTS parametres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_bureau text NOT NULL DEFAULT 'URATEC',
  adresse text,
  telephone text,
  email text,
  devise text NOT NULL DEFAULT 'DZD',
  annee_courante int NOT NULL DEFAULT 2026,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_parametres" ON parametres;
CREATE POLICY "anon_select_parametres" ON parametres FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_parametres" ON parametres;
CREATE POLICY "anon_insert_parametres" ON parametres FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_parametres" ON parametres;
CREATE POLICY "anon_update_parametres" ON parametres FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_parametres" ON parametres;
CREATE POLICY "anon_delete_parametres" ON parametres FOR DELETE TO anon, authenticated USING (true);
