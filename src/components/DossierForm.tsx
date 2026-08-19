import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Field, inputCls, selectCls, textareaCls } from '@/components/Field';
import {
  DOMAINES,
  PRESTATIONS_PAR_DOMAINE,
  DOSSIER_ETATS,
  ETAT_PIECES,
  TYPES_JURIDICTION,
  TRIBUNAUX_JUDICIAIRE,
  type Client,
  type Dossier,
  type Domaine,
} from '@/types';
import { todayISO } from '@/utils/helpers';

interface DossierFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Dossier, 'id' | 'created_at' | 'numero'>) => Promise<void>;
  clients: Client[];
  initial?: Dossier | null;
}

export function DossierForm({
  open,
  onClose,
  onSave,
  clients,
  initial,
}: DossierFormProps) {
  const [form, setForm] = useState({
    client_id: '',
    telephone: '',
    reference: '',
    domaine: '' as Domaine | '',
    prestation: '',
    date_reception: todayISO(),
    date_limite: '',
    etat_pieces: 'Complet',
    pieces_manquantes: '',
    prix_total: '0',
    etape_actuelle: '',
    avancement: '0',
    etat: 'NOUVEAU',
    observations: '',
    type_juridiction: '',
    juridiction: '',
  });
  const [prestationAutre, setPrestationAutre] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        client_id: initial.client_id ?? '',
        telephone: initial.telephone ?? '',
        reference: initial.reference ?? '',
        domaine: (initial.domaine as Domaine) ?? '',
        prestation: initial.prestation ?? '',
        date_reception: initial.date_reception
          ? new Date(initial.date_reception).toISOString().split('T')[0]
          : todayISO(),
        date_limite: initial.date_limite
          ? new Date(initial.date_limite).toISOString().split('T')[0]
          : '',
        etat_pieces: initial.etat_pieces ?? 'Complet',
        pieces_manquantes: initial.pieces_manquantes ?? '',
        prix_total: String(initial.prix_total ?? '0'),
        etape_actuelle: initial.etape_actuelle ?? '',
        avancement: String(initial.avancement ?? '0'),
        etat: initial.etat ?? 'NOUVEAU',
        observations: initial.observations ?? '',
        type_juridiction: initial.type_juridiction ?? '',
        juridiction: initial.juridiction ?? '',
      });
      setPrestationAutre(initial.prestation_autre ?? '');
    } else {
      setForm({
        client_id: '',
        telephone: '',
        reference: '',
        domaine: '',
        prestation: '',
        date_reception: todayISO(),
        date_limite: '',
        etat_pieces: 'Complet',
        pieces_manquantes: '',
        prix_total: '0',
        etape_actuelle: '',
        avancement: '0',
        etat: 'NOUVEAU',
        observations: '',
        type_juridiction: '',
        juridiction: '',
      });
      setPrestationAutre('');
    }
    setErrors({});
  }, [initial, open]);

  const prestations = form.domaine
    ? PRESTATIONS_PAR_DOMAINE[form.domaine] ?? []
    : [];
  const isAutre = form.prestation === 'Autre';
  const isExpertiseJudiciaire =
    form.domaine === 'Expertise judiciaire' &&
    form.prestation === 'Expertise judiciaire';
  const isJuridictionJudiciaire =
    isExpertiseJudiciaire && form.type_juridiction === 'Juridiction judiciaire';

  function handleDomaineChange(value: string) {
    setForm({
      ...form,
      domaine: value as Domaine,
      prestation: '',
      type_juridiction: '',
      juridiction: '',
    });
    setPrestationAutre('');
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.client_id) e.client_id = 'Le client est obligatoire';
    if (!form.domaine) e.domaine = 'Le domaine est obligatoire';
    if (!form.prestation) e.prestation = 'La prestation est obligatoire';
    if (isAutre && !prestationAutre.trim())
      e.prestation_autre = 'Précisez la prestation';
    if (!form.date_reception) e.date_reception = 'La date de réception est obligatoire';
    const prix = parseFloat(form.prix_total);
    if (isNaN(prix) || prix < 0) e.prix_total = 'Prix invalide';
    const av = parseInt(form.avancement, 10);
    if (isNaN(av) || av < 0 || av > 100)
      e.avancement = 'L\'avancement doit être entre 0 et 100';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        client_id: form.client_id || null,
        telephone: form.telephone || null,
        reference: form.reference || null,
        domaine: form.domaine,
        prestation: isAutre ? 'Autre' : form.prestation,
        prestation_autre: isAutre ? prestationAutre.trim() || null : null,
        date_reception: form.date_reception,
        date_limite: form.date_limite || null,
        etat_pieces: form.etat_pieces,
        pieces_manquantes: form.pieces_manquantes || null,
        prix_total: parseFloat(form.prix_total) || 0,
        etape_actuelle: form.etape_actuelle || null,
        avancement: parseInt(form.avancement, 10) || 0,
        etat: form.etat,
        observations: form.observations || null,
        type_juridiction: isExpertiseJudiciaire ? form.type_juridiction || null : null,
        juridiction: isExpertiseJudiciaire ? form.juridiction || null : null,
      });
      onClose();
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier le dossier' : 'Nouveau dossier'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client" required>
            <select
              className={selectCls}
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">— Sélectionner —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="text-xs text-red-500 mt-1">{errors.client_id}</p>
            )}
          </Field>

          <Field label="Téléphone">
            <input
              className={inputCls}
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="Téléphone de contact"
            />
          </Field>

          <Field label="Référence">
            <input
              className={inputCls}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Référence interne"
            />
          </Field>

          <Field label="Domaine" required>
            <select
              className={selectCls}
              value={form.domaine}
              onChange={(e) => handleDomaineChange(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {DOMAINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.domaine && (
              <p className="text-xs text-red-500 mt-1">{errors.domaine}</p>
            )}
          </Field>

          <Field label="Prestation" required>
            <select
              className={selectCls}
              value={form.prestation}
              onChange={(e) => {
                setForm({ ...form, prestation: e.target.value });
                setPrestationAutre('');
              }}
              disabled={!form.domaine}
            >
              <option value="">— Sélectionner —</option>
              {prestations.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.prestation && (
              <p className="text-xs text-red-500 mt-1">{errors.prestation}</p>
            )}
          </Field>

          {isAutre && (
            <Field label="Préciser la prestation" required>
              <input
                className={inputCls}
                value={prestationAutre}
                onChange={(e) => setPrestationAutre(e.target.value)}
                placeholder="Décrire la prestation"
              />
              {errors.prestation_autre && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.prestation_autre}
                </p>
              )}
            </Field>
          )}

          {isExpertiseJudiciaire && (
            <Field label="Type de juridiction" required>
              <select
                className={selectCls}
                value={form.type_juridiction}
                onChange={(e) =>
                  setForm({ ...form, type_juridiction: e.target.value, juridiction: '' })
                }
              >
                <option value="">— Sélectionner —</option>
                {TYPES_JURIDICTION.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isJuridictionJudiciaire && (
            <Field label="Juridiction" required>
              <select
                className={selectCls}
                value={form.juridiction}
                onChange={(e) =>
                  setForm({ ...form, juridiction: e.target.value })
                }
              >
                <option value="">— Sélectionner —</option>
                {Object.keys(TRIBUNAUX_JUDICIAIRE).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isExpertiseJudiciaire &&
            form.type_juridiction === 'Juridiction administrative' && (
              <Field label="Juridiction" required>
                <select
                  className={selectCls}
                  value={form.juridiction}
                  onChange={(e) =>
                    setForm({ ...form, juridiction: e.target.value })
                  }
                >
                  <option value="">— Sélectionner —</option>
                  <option value="Tribunal administratif">
                    Tribunal administratif
                  </option>
                </select>
              </Field>
            )}

          {isExpertiseJudiciaire &&
            form.type_juridiction === "Conseil d'État" && (
              <Field label="Juridiction" required>
                <select
                  className={selectCls}
                  value={form.juridiction}
                  onChange={(e) =>
                    setForm({ ...form, juridiction: e.target.value })
                  }
                >
                  <option value="">— Sélectionner —</option>
                  <option value="Conseil d'État">Conseil d'État</option>
                </select>
              </Field>
            )}

          <Field label="État des pièces">
            <select
              className={selectCls}
              value={form.etat_pieces}
              onChange={(e) =>
                setForm({ ...form, etat_pieces: e.target.value })
              }
            >
              {ETAT_PIECES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date de réception" required>
            <input
              type="date"
              className={inputCls}
              value={form.date_reception}
              onChange={(e) =>
                setForm({ ...form, date_reception: e.target.value })
              }
            />
            {errors.date_reception && (
              <p className="text-xs text-red-500 mt-1">{errors.date_reception}</p>
            )}
          </Field>

          <Field label="Date limite">
            <input
              type="date"
              className={inputCls}
              value={form.date_limite}
              onChange={(e) => setForm({ ...form, date_limite: e.target.value })}
            />
          </Field>

          <Field label="Prix total (DA)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={form.prix_total}
              onChange={(e) =>
                setForm({ ...form, prix_total: e.target.value })
              }
            />
            {errors.prix_total && (
              <p className="text-xs text-red-500 mt-1">{errors.prix_total}</p>
            )}
          </Field>

          <Field label="Avancement (%)">
            <input
              type="number"
              min="0"
              max="100"
              className={inputCls}
              value={form.avancement}
              onChange={(e) =>
                setForm({ ...form, avancement: e.target.value })
              }
            />
            {errors.avancement && (
              <p className="text-xs text-red-500 mt-1">{errors.avancement}</p>
            )}
          </Field>

          <Field label="Étape actuelle">
            <input
              className={inputCls}
              value={form.etape_actuelle}
              onChange={(e) =>
                setForm({ ...form, etape_actuelle: e.target.value })
              }
              placeholder="Ex: En cours de relevé"
            />
          </Field>

          <Field label="État">
            <select
              className={selectCls}
              value={form.etat}
              onChange={(e) => setForm({ ...form, etat: e.target.value })}
            >
              {DOSSIER_ETATS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Pièces manquantes">
          <textarea
            className={textareaCls}
            value={form.pieces_manquantes}
            onChange={(e) =>
              setForm({ ...form, pieces_manquantes: e.target.value })
            }
            placeholder="Décrire les pièces manquantes si l'état est incomplet"
          />
        </Field>

        <Field label="Observations">
          <textarea
            className={textareaCls}
            value={form.observations}
            onChange={(e) =>
              setForm({ ...form, observations: e.target.value })
            }
          />
        </Field>

        {errors.submit && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {errors.submit}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
