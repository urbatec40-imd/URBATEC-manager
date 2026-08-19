/*
# Ajout des champs de localisation aux clients

## Objectif
Permettre de renseigner la localisation géographique de chaque client
(wilaya, daïra, commune, section, îlot) dans la wilaya de Khenchela.

## Changements
1. Ajout des colonnes suivantes à la table `clients` :
   - `wilaya` (text, défaut 'Khenchela') — toujours Khenchela
   - `daira` (text) — daïra correspondant à la commune sélectionnée
   - `commune` (text) — une des 21 communes de Khenchela
   - `section` (text) — saisie libre
   - `ilot` (text) — saisie libre

2. Aucune modification des politiques RLS existantes.
3. Aucune suppression de données.

## Sécurité
- Aucun changement de politique RLS.
- Les nouvelles colonnes sont accessibles aux mêmes rôles que les colonnes existantes.
*/

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS wilaya text DEFAULT 'Khenchela',
  ADD COLUMN IF NOT EXISTS daira text DEFAULT '',
  ADD COLUMN IF NOT EXISTS commune text DEFAULT '',
  ADD COLUMN IF NOT EXISTS section text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ilot text DEFAULT '';
