import { useState } from 'react';
import { KeyRound, UserCircle2, ShieldCheck, Info } from 'lucide-react';
import * as authService from '@/services/authService';
import type { Session } from '@/types';

export function ComptePage({ session }: { session: Session }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Mot de passe modifié avec succès.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><UserCircle2 size={15}/> Nom d'utilisateur</div><div className="mt-1 font-bold text-slate-800">{session.username || '—'}</div></div>
        <div className="rounded-lg border bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><UserCircle2 size={15}/> Nom complet</div><div className="mt-1 font-bold text-slate-800">{session.nom_complet || '—'}</div></div>
        <div className="rounded-lg border bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><ShieldCheck size={15}/> Rôle</div><div className="mt-1 font-bold text-slate-800">{session.role || '—'}</div></div>
      </div>

      <form onSubmit={handleChangePassword} className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center gap-2"><KeyRound size={18} className="text-sky-600"/><h4 className="font-bold text-slate-800">Modifier le mot de passe</h4></div>
        <p className="text-xs text-slate-500">Le changement fonctionne hors ligne et demande le mot de passe actuel.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm text-slate-700"><span className="mb-1 block font-medium">Mot de passe actuel</span><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required className="w-full rounded-lg border px-3 py-2"/></label>
          <label className="text-sm text-slate-700"><span className="mb-1 block font-medium">Nouveau mot de passe</span><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={4} className="w-full rounded-lg border px-3 py-2"/></label>
          <label className="text-sm text-slate-700"><span className="mb-1 block font-medium">Confirmer</span><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={4} className="w-full rounded-lg border px-3 py-2"/></label>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"><KeyRound size={15}/>{saving ? 'Enregistrement...' : 'Modifier le mot de passe'}</button>
      </form>

      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"><Info size={18} className="mt-0.5 shrink-0 text-blue-600"/><div className="text-sm text-blue-800"><div className="font-semibold">Mot de passe oublié</div><div className="mt-1">La récupération par Email n'est pas encore activée dans cette version. Elle pourra être ajoutée séparément avec une connexion Internet, sans modifier l'authentification offline.</div></div></div>
    </div>
  );
}
