import { useState, useEffect } from 'react';
import { Save, Building2, Info } from 'lucide-react';
import type { Parametres } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Field, inputCls } from '@/components/Field';

interface ParametresPageProps {
  parametres: Parametres | null;
  onSave: (id: string, p: Partial<Parametres>) => Promise<void>;
}

export function ParametresPage({ parametres, onSave }: ParametresPageProps) {
  const [form, setForm] = useState({
    nom_bureau: 'URATEC',
    adresse: '',
    telephone: '',
    email: '',
    devise: 'DZD',
    annee_courante: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (parametres) {
      setForm({
        nom_bureau: parametres.nom_bureau,
        adresse: parametres.adresse ?? '',
        telephone: parametres.telephone ?? '',
        email: parametres.email ?? '',
        devise: parametres.devise,
        annee_courante: parametres.annee_courante,
      });
    }
  }, [parametres]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parametres) return;
    setSaving(true);
    try {
      await onSave(parametres.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configuration du bureau d'études" />

      <div className="max-w-3xl space-y-6">
        <form
          onSubmit={submit}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={20} className="text-sky-600" />
            <h3 className="font-bold text-gray-800">Informations du bureau</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nom du bureau" required>
              <input
                className={inputCls}
                value={form.nom_bureau}
                onChange={(e) =>
                  setForm({ ...form, nom_bureau: e.target.value })
                }
              />
            </Field>
            <Field label="Téléphone">
              <input
                className={inputCls}
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Devise">
              <input
                className={inputCls}
                value={form.devise}
                onChange={(e) => setForm({ ...form, devise: e.target.value })}
                disabled
              />
            </Field>
            <Field label="Année courante">
              <input
                type="number"
                className={inputCls}
                value={form.annee_courante}
                onChange={(e) =>
                  setForm({
                    ...form,
                    annee_courante: parseInt(e.target.value, 10) || 2026,
                  })
                }
              />
            </Field>
            <Field label="Adresse" className="md:col-span-2">
              <input
                className={inputCls}
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Paramètres enregistrés
              </span>
            )}
          </div>
        </form>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 text-sm mb-1">
              Gestion des documents — Références locales
            </h4>
            <p className="text-sm text-blue-700">
              Les fichiers ne sont jamais copiés ni uploadés vers Internet.
              URATEC MANAGER enregistre uniquement le chemin du fichier original
              sur votre PC (ex: D:\PROJETS\TOPO\LEVE.dwg) ainsi que ses métadonnées
              (nom, extension, catégorie, observation). Les fichiers physiques
              restent à leur emplacement original. L'ouverture directe des fichiers
              et la vérification de leur existence nécessitent la future version
              Desktop (Tauri ou Electron).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
