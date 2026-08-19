import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Field, inputCls, selectCls } from '@/components/Field';

interface EnvironnementPageProps {
  clientName?: string;
  dossierNumero?: string;
  initialPrestation?: string;
  onBack?: () => void;
}

type ResultatReglementaire = {
  activite: string;
  rubrique: string;
  regime: string;
  seuil: string;
  facteur: string;
  classement: string;
  document: string;
  references: string[];
  confiance: 'Élevée' | 'Moyenne' | 'À vérifier';
};

function analyserClassement(activite: string, capacite: number): ResultatReglementaire | null {
  const normalized = activite.trim().toLowerCase();

  const isPoultry =
    normalized.includes('poulet') ||
    normalized.includes('volaille') ||
    normalized.includes('avicole') ||
    normalized.includes('poussins');

  if (!isPoultry || !Number.isFinite(capacite) || capacite <= 0) return null;

  const animauxEquivalents = capacite;

  if (animauxEquivalents > 20000) {
    return {
      activite: 'Élevage de volailles',
      rubrique: '2121',
      regime: 'AW',
      seuil: '> 20 000 animaux-équivalents',
      facteur: 'Poules, poulets, faisans et pintades = 1 animal-équivalent',
      classement: 'AW',
      document: 'À déterminer selon le régime et les caractéristiques du projet',
      references: ['Décret exécutif n° 07-144 du 19 mai 2007 — rubrique 2121'],
      confiance: 'Élevée',
    };
  }

  if (animauxEquivalents >= 5000) {
    return {
      activite: 'Élevage de volailles',
      rubrique: '2121',
      regime: 'APAPC',
      seuil: '5 000 à 20 000 animaux-équivalents',
      facteur: 'Poules, poulets, faisans et pintades = 1 animal-équivalent',
      classement: 'APAPC',
      document: 'À vérifier selon la nomenclature et les textes environnementaux applicables',
      references: ['Décret exécutif n° 07-144 du 19 mai 2007 — rubrique 2121'],
      confiance: 'Élevée',
    };
  }

  return {
    activite: 'Élevage de volailles',
    rubrique: '2121',
    regime: 'D',
    seuil: '< 5 000 animaux-équivalents',
    facteur: 'Poules, poulets, faisans et pintades = 1 animal-équivalent',
    classement: '2121-3 / D — Déclaration',
    document: 'À déterminer après analyse des dispositions applicables au projet',
    references: ['Décret exécutif n° 07-144 du 19 mai 2007 — rubrique 2121'],
    confiance: 'Élevée',
  };
}

export function EnvironnementPage({
  clientName,
  dossierNumero,
  initialPrestation,
  onBack,
}: EnvironnementPageProps) {
  const [activite, setActivite] = useState('');
  const [capacite, setCapacite] = useState('');
  const [unite, setUnite] = useState('sujets');
  const [commune, setCommune] = useState('');
  const [surface, setSurface] = useState('');
  const [eau, setEau] = useState('');
  const [energie, setEnergie] = useState('');
  const [travailleurs, setTravailleurs] = useState('');
  const [prestation, setPrestation] = useState(initialPrestation ?? "Déclaration d'exploitation – PAPC");
  const [analyse, setAnalyse] = useState<ResultatReglementaire | null>(null);
  const [estimations, setEstimations] = useState(false);

  const capaciteNombre = Number(capacite);
  const isPoultry = useMemo(() => {
    const a = activite.toLowerCase();
    return a.includes('poulet') || a.includes('volaille') || a.includes('avicole') || a.includes('poussin');
  }, [activite]);

  function lancerAnalyse() {
    setAnalyse(analyserClassement(activite, capaciteNombre));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Module Environnement"
        subtitle={dossierNumero ? `Dossier ${dossierNumero}` : 'Analyse réglementaire et préparation des documents environnementaux'}
        actions={onBack ? <button onClick={onBack} className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Retour</button> : undefined}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search size={18} className="text-sky-600" />
            <h2 className="font-semibold text-gray-800">Identification du projet</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Client">
              <input className={inputCls} value={clientName ?? ''} placeholder="Client du dossier" readOnly />
            </Field>
            <Field label="Prestation">
              <select className={selectCls} value={prestation} onChange={(e) => setPrestation(e.target.value)}>
                <option>Déclaration d'exploitation – PAPC</option>
                <option>Notice d'impact sur l'environnement</option>
                <option>Étude d'impact sur l'environnement</option>
                <option>Étude de danger</option>
                <option>Rapport sur les produits dangereux</option>
                <option>Audit environnemental</option>
                <option>Mise en conformité environnementale</option>
              </select>
            </Field>
            <Field label="Activité" required>
              <input className={inputCls} value={activite} onChange={(e) => setActivite(e.target.value)} placeholder="Ex. Élevage de poulets de chair" />
            </Field>
            <Field label="Capacité" required>
              <input className={inputCls} type="number" min="0" value={capacite} onChange={(e) => setCapacite(e.target.value)} placeholder="Ex. 1000" />
            </Field>
            <Field label="Unité">
              <select className={selectCls} value={unite} onChange={(e) => setUnite(e.target.value)}>
                <option value="sujets">sujets</option>
                <option value="animaux">animaux</option>
                <option value="tonnes/an">tonnes/an</option>
                <option value="m3/an">m³/an</option>
                <option value="kW">kW</option>
              </select>
            </Field>
            <Field label="Commune">
              <input className={inputCls} value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Ex. Ensigha" />
            </Field>
            <Field label="Surface (m²)">
              <input className={inputCls} type="number" min="0" value={surface} onChange={(e) => setSurface(e.target.value)} />
            </Field>
            <Field label="Consommation d'eau (L/an) — si connue">
              <input className={inputCls} type="number" min="0" value={eau} onChange={(e) => setEau(e.target.value)} />
            </Field>
            <Field label="Consommation électrique (kWh/an) — si connue">
              <input className={inputCls} type="number" min="0" value={energie} onChange={(e) => setEnergie(e.target.value)} />
            </Field>
            <Field label="Travailleurs">
              <input className={inputCls} type="number" min="0" value={travailleurs} onChange={(e) => setTravailleurs(e.target.value)} />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={lancerAnalyse} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700">
              <ShieldCheck size={17} />
              Analyser le classement
            </button>
            <button onClick={() => setEstimations(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 text-sm font-semibold hover:bg-violet-100">
              <Sparkles size={17} />
              Estimations IA
            </button>
          </div>
        </section>

        <section className="bg-slate-900 text-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={19} className="text-emerald-400" />
            <h2 className="font-semibold">Analyse réglementaire</h2>
          </div>

          {!analyse ? (
            <div className="text-sm text-slate-400 leading-relaxed">
              Entrez l'activité et la capacité puis lancez l'analyse. La décision réglementaire doit rester traçable par référence au texte applicable.
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-xs text-slate-400">Rubrique</div>
                <div className="text-lg font-bold mt-1">{analyse.rubrique}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">Régime</div><div className="font-semibold mt-1">{analyse.regime}</div></div>
                <div><div className="text-xs text-slate-400">Classement</div><div className="font-semibold mt-1">{analyse.classement}</div></div>
              </div>
              <div><div className="text-xs text-slate-400">Seuil</div><div className="mt-1">{analyse.seuil}</div></div>
              <div><div className="text-xs text-slate-400">Facteur</div><div className="mt-1">{analyse.facteur}</div></div>
              <div className="rounded-lg border border-white/10 p-3">
                <div className="text-xs text-slate-400">Document à préparer</div>
                <div className="font-semibold mt-1">{analyse.document}</div>
              </div>
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 size={16} />
                Niveau de confiance : {analyse.confiance}
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="text-xs text-slate-400 mb-1">Références</div>
                {analyse.references.map((ref) => <div key={ref}>{ref}</div>)}
              </div>
            </div>
          )}
        </section>
      </div>

      {isPoultry && analyse && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-sky-600" />
            <h2 className="font-semibold text-gray-800">Préparation du dossier environnemental</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-gray-50 p-4"><div className="text-xs text-gray-500">Activité</div><div className="font-semibold mt-1">{analyse.activite}</div></div>
            <div className="rounded-lg bg-gray-50 p-4"><div className="text-xs text-gray-500">Capacité</div><div className="font-semibold mt-1">{capacite} {unite}</div></div>
            <div className="rounded-lg bg-gray-50 p-4"><div className="text-xs text-gray-500">Localisation</div><div className="font-semibold mt-1">{commune || 'À compléter'}</div></div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>Les valeurs estimées ou les propositions de documents doivent être vérifiées par le bureau d'études avant validation finale.</div>
          </div>
        </section>
      )}

      {estimations && (
        <section className="bg-violet-50 rounded-xl border border-violet-200 p-5">
          <div className="flex items-center gap-2 mb-2 text-violet-800">
            <Sparkles size={18} />
            <h2 className="font-semibold">Estimations IA — préparation</h2>
          </div>
          <p className="text-sm text-violet-900/80">
            Le module est prêt à recevoir un moteur d'estimation basé sur des références techniques vérifiables. Les valeurs prévisionnelles seront toujours distinguées des données réelles fournies par le promoteur.
          </p>
        </section>
      )}
    </div>
  );
}
