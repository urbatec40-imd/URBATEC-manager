import { useState } from 'react';
import { KeyRound, Lock, User, AlertTriangle } from 'lucide-react';
import * as authService from '@/services/authService';

export function ComptePage() {
  const user = authService.getCurrentUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('');
    if (next !== confirm) return setError('Les nouveaux mots de passe ne correspondent pas.');
    setBusy(true);
    try { await authService.changePassword(current, next); setCurrent(''); setNext(''); setConfirm(''); setMessage('Mot de passe modifié avec succès.'); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <div className="max-w-3xl space-y-6">
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5"><User size={20} className="text-sky-600"/><h3 className="font-bold text-gray-800">Mon compte</h3></div>
      {user ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-slate-50 p-4"><div className="text-xs text-gray-500">Nom d'utilisateur</div><div className="font-bold mt-1">{user.username}</div></div>
        <div className="rounded-lg border bg-slate-50 p-4"><div className="text-xs text-gray-500">Nom complet</div><div className="font-bold mt-1">{user.nom_complet || '—'}</div></div>
        <div className="rounded-lg border bg-slate-50 p-4"><div className="text-xs text-gray-500">Rôle</div><div className="font-bold mt-1 text-sky-700">{user.role}</div></div>
      </div> : <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">Aucun compte connecté.</p>}
    </section>
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5"><KeyRound size={20} className="text-sky-600"/><div><h3 className="font-bold text-gray-800">Modifier le mot de passe</h3><p className="text-xs text-gray-500">Fonctionne hors connexion.</p></div></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Mot de passe actuel<input type="password" required value={current} onChange={e=>setCurrent(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"/></label>
        <label className="block text-sm font-medium text-gray-700">Nouveau mot de passe<input type="password" required value={next} onChange={e=>setNext(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"/></label>
        <label className="block text-sm font-medium text-gray-700">Confirmer le nouveau mot de passe<input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"/></label>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 border border-green-100 p-3 rounded-lg">{message}</p>}
        <button type="submit" disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-50"><Lock size={16}/>{busy?'Modification...':'Modifier le mot de passe'}</button>
      </form>
    </section>
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3"><AlertTriangle size={20} className="text-amber-600"/><div><h3 className="font-bold text-gray-800">Mot de passe oublié</h3><p className="text-xs text-gray-500">Récupération par email</p></div></div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2"><p className="font-semibold">Pas de faux bouton de réinitialisation.</p><p>La version actuelle est 100 % offline et ne contient pas encore de service d'envoi d'email. Le parcours par email sera activé plus tard avec Internet, sans modifier l'utilisation Offline quotidienne.</p></div>
    </section>
  </div>;
}
