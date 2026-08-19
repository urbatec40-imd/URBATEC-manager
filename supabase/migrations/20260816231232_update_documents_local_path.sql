/*
# Migration — Documents : références de fichiers locaux (sans stockage cloud)

## Objectif
Remplacer le stockage cloud (Supabase Storage) par des références de chemins locaux.
Les fichiers physiques ne sont JAMAIS copiés. Seules les métadonnées sont enregistrées.

## Changements
1. Ajout des colonnes `extension`, `local_path`, `statut` à la table `documents`.
2. La colonne `chemin_stockage` est conservée pour compatibilité mais n'est plus utilisée.
3. `local_path` contient le chemin complet du fichier original sur le PC de l'utilisateur.
4. `extension` contient l'extension du fichier (DWG, PDF, XYZ, etc.).
5. `statut` indique la disponibilité du fichier (DISPONIBLE, INTROUVABLE, NON_VÉRIFIÉ).

## Sécurité
- Aucune modification des politiques RLS existantes.
- Aucune suppression de données.
*/

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS extension text DEFAULT '',
  ADD COLUMN IF NOT EXISTS local_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS statut text DEFAULT 'NON_VÉRIFIÉ';
