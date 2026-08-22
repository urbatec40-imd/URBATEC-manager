import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, UserRound } from 'lucide-react';
import type { Client } from '@/types';

type Props = {
  clients: Client[];
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<void>;
  onClose: () => void;
};

const fields = [
  ['nom', 'Nom / Raison sociale'],
  ['telephone', 'Téléphone'],
  ['email', 'E-mail'],
  ['adresse', 'Adresse'],
  ['wilaya', 'Wilaya'],
  ['daira', 'Daïra'],
  ['commune', 'Commune'],
  ['observations', 'Observations'],
] as const;

export function Demande4300Page({ clients, onUpdateClient, onClose }: Props) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  useEffect(() => {
    if (!client) { setForm({}); return; }
    const c = client as Client & Record<string, unknown>;
    const next: Record<string, string> = {};
    fields.forEach(([key]) => { next[key] = String(c[key] ?? ''); });
    setForm(next);
    setMessage('');
  }, [client]);

  const setValue = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!client) return;
    if (!form.nom?.trim()) { setMessage('Le nom du client est obligatoire.'); return; }
    setSaving(true); setMessage('');
    try {
      await onUpdateClient(client.id, form as Partial<Client>);
      setMessage('Informations du client enregistrées.');
    } catch (e) {
      setMessage(`Erreur : ${(e as Error).message}`);
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-full bg-slate-50 -m-4 lg:-m-6 p-4 lg:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={18}/>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Demande 4300</h1>
              <p className="text-sm text-slate-500">Informations du client reprises depuis le module Clients</p>
            </div>
          </div>
          <button type="button" onClick={save} disabled={!client || saving} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
            <Save size={16}/> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
            <UserRound size={20} className="text-sky-600"/>
            <h2 className="font-semibold text-slate-900">Client</h2>
          </div>

          {clients.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Aucun client enregistré dans le module Clients.</div>
          ) : (
            <>
              <div className="mb-5 max-w-xl">
                <label className="mb-1 block text-sm font-medium text-slate-700">Sélectionner le client</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map(([key, label]) => (
                  <div key={key} className={key === 'observations' ? 'md:col-span-2' : ''}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                    {key === 'observations' ? (
                      <textarea value={form[key] ?? ''} onChange={e => setValue(key, e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"/>
                    ) : (
                      <input value={form[key] ?? ''} onChange={e => setValue(key, e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"/>
                    )}
                  </div>
                ))}
              </div>

              {message && <div className={`mt-5 rounded-lg px-3 py-2 text-sm ${message.startsWith('Erreur') || message.includes('obligatoire') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
