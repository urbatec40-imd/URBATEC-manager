import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserCog,
  KeyRound,
  Save,
  PlusCircle,
  Trash2,
  RotateCcw,
  Info,
  Lock,
  Eye,
  EyeOff,
  BadgeCheck,
  Users,
} from 'lucide-react';
import type { Session, User, UserRole } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Field, inputCls } from '@/components/Field';
import { Modal } from '@/components/Modal';
import * as authService from '@/services/authService';

interface CompteSecuritePageProps {
  session: Session;
  onSessionUpdate: (session: Session) => void;
}

function passwordScore(pwd: string): number {
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(s, 4);
}

const STRENGTH_LABELS = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort'];
const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-600',
];

const ROLES: UserRole[] = ['Administrateur', 'Utilisateur'];

function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoFocus={autoFocus}
        className={`${inputCls} pl-9 pr-10`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={show ? 'Masquer' : 'Afficher'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function CompteSecuritePage({ session, onSessionUpdate }: CompteSecuritePageProps) {
  const isAdmin = session.role === 'Administrateur';

  const [profileForm, setProfileForm] = useState({
    nom_complet: session.nom_complet || '',
    username: session.username || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const [users, setUsers] = useState<Array<Omit<User, 'password_hash'>>>([]);
  const [usersErr, setUsersErr] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    username: '',
    nom_complet: '',
    password: '',
    confirm: '',
    role: 'Utilisateur' as UserRole,
  });
  const [addErr, setAddErr] = useState('');
  const [resetTarget, setResetTarget] = useState<Omit<User, 'password_hash'> | null>(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetErr, setResetErr] = useState('');

  const reloadUsers = () => setUsers(authService.listUsers());
  useEffect(() => {
    if (isAdmin) reloadUsers();
  }, [isAdmin]);

  const me = authService.getUserById(session.user_id);

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileSaving(true);
    try {
      const updated = await authService.updateProfile(session.user_id, profileForm);
      onSessionUpdate(updated);
      setProfileMsg('Profil mis à jour');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileErr((err as Error).message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdErr('');
    setPwdMsg('');
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdErr('Les mots de passe ne correspondent pas');
      return;
    }
    setPwdSaving(true);
    try {
      await authService.changePassword(session.user_id, pwdForm.current, pwdForm.next);
      setPwdForm({ current: '', next: '', confirm: '' });
      setPwdMsg('Mot de passe modifié avec succès');
      setTimeout(() => setPwdMsg(''), 3000);
    } catch (err) {
      setPwdErr((err as Error).message);
    } finally {
      setPwdSaving(false);
    }
  }

  async function submitAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddErr('');
    if (addForm.password !== addForm.confirm) {
      setAddErr('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await authService.adminCreateUser(
        session.user_id,
        addForm.username,
        addForm.nom_complet,
        addForm.password,
        addForm.role
      );
      setAddOpen(false);
      setAddForm({ username: '', nom_complet: '', password: '', confirm: '', role: 'Utilisateur' });
      reloadUsers();
    } catch (err) {
      setAddErr((err as Error).message);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetErr('');
    if (!resetTarget) return;
    if (resetForm.password !== resetForm.confirm) {
      setResetErr('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await authService.adminResetPassword(
        session.user_id,
        resetTarget.id,
        resetForm.password
      );
      setResetTarget(null);
      setResetForm({ password: '', confirm: '' });
    } catch (err) {
      setResetErr((err as Error).message);
    }
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setUsersErr('');
    try {
      authService.updateUserRole(session.user_id, userId, role);
      reloadUsers();
    } catch (err) {
      setUsersErr((err as Error).message);
      reloadUsers();
    }
  }

  async function handleDeleteUser(user: Omit<User, 'password_hash'>) {
    setUsersErr('');
    if (!window.confirm(`Supprimer définitivement le compte « ${user.username} » ?`)) return;
    try {
      authService.deleteUser(session.user_id, user.id);
      reloadUsers();
    } catch (err) {
      setUsersErr((err as Error).message);
    }
  }

  const score = passwordScore(pwdForm.next);

  return (
    <div>
      <PageHeader title="Compte & Sécurité" subtitle="Gérez votre profil et la sécurité de l'application" />

      <div className="max-w-4xl space-y-6">
        {/* Carte profil */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
            {(session.nom_complet || session.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-800 truncate">
                {session.nom_complet || session.username || 'Utilisateur'}
              </h2>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isAdmin
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {isAdmin && <BadgeCheck size={12} />}
                {session.role}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">@{session.username}</p>
            {me && (
              <p className="text-xs text-gray-400 mt-1">
                Compte créé le{' '}
                {new Date(me.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Modifier le profil */}
          <form
            onSubmit={submitProfile}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <UserCog size={20} className="text-sky-600" />
              <h3 className="font-bold text-gray-800">Modifier le profil</h3>
            </div>
            <div className="space-y-4">
              <Field label="Nom complet" required>
                <input
                  className={inputCls}
                  value={profileForm.nom_complet}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, nom_complet: e.target.value })
                  }
                />
              </Field>
              <Field label="Nom d'utilisateur" required>
                <input
                  className={inputCls}
                  value={profileForm.username}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, username: e.target.value })
                  }
                />
              </Field>
            </div>
            {profileErr && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{profileErr}</p>
            )}
            <div className="flex items-center gap-3 mt-5">
              <button
                type="submit"
                disabled={profileSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              {profileMsg && (
                <span className="text-sm text-green-600 font-medium">{profileMsg}</span>
              )}
            </div>
          </form>

          {/* Changer le mot de passe */}
          <form
            onSubmit={submitPassword}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <KeyRound size={20} className="text-sky-600" />
              <h3 className="font-bold text-gray-800">Changer le mot de passe</h3>
            </div>
            <div className="space-y-4">
              <Field label="Mot de passe actuel" required>
                <PasswordInput
                  value={pwdForm.current}
                  onChange={(v) => setPwdForm({ ...pwdForm, current: v })}
                />
              </Field>
              <Field label="Nouveau mot de passe" required>
                <PasswordInput
                  value={pwdForm.next}
                  onChange={(v) => setPwdForm({ ...pwdForm, next: v })}
                />
              </Field>
              {pwdForm.next && (
                <div>
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < score ? STRENGTH_COLORS[score] : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${score <= 1 ? 'text-red-600' : score === 2 ? 'text-orange-600' : 'text-green-700'}`}>
                    Robustesse : {STRENGTH_LABELS[score]}
                  </p>
                </div>
              )}
              <Field label="Confirmer le nouveau mot de passe" required>
                <PasswordInput
                  value={pwdForm.confirm}
                  onChange={(v) => setPwdForm({ ...pwdForm, confirm: v })}
                />
              </Field>
            </div>
            {pwdErr && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{pwdErr}</p>
            )}
            <div className="flex items-center gap-3 mt-5">
              <button
                type="submit"
                disabled={pwdSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {pwdSaving ? 'Modification...' : 'Modifier'}
              </button>
              {pwdMsg && <span className="text-sm text-green-600 font-medium">{pwdMsg}</span>}
            </div>
          </form>
        </div>

        {/* Gestion des utilisateurs (admin) */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-sky-600" />
                <h3 className="font-bold text-gray-800">Gestion des utilisateurs</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                  {users.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setAddErr('');
                  setAddOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
              >
                <PlusCircle size={16} />
                Nouvel utilisateur
              </button>
            </div>

            {usersErr && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{usersErr}</p>
            )}

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4 font-semibold">Utilisateur</th>
                    <th className="py-2 pr-4 font-semibold">Rôle</th>
                    <th className="py-2 pr-4 font-semibold">Créé le</th>
                    <th className="py-2 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isMe = u.id === session.user_id;
                    return (
                      <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(u.nom_complet || u.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">
                                {u.nom_complet || u.username}
                                {isMe && (
                                  <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
                                    Vous
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={u.role}
                            disabled={isMe}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="text-xs rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setResetErr('');
                                setResetForm({ password: '', confirm: '' });
                                setResetTarget(u);
                              }}
                              title="Réinitialiser le mot de passe"
                              className="p-2 rounded-lg text-gray-500 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            >
                              <RotateCcw size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isMe}
                              title={isMe ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
                              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Infos sécurité */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-800 text-sm mb-1">
              Sécurité des données
            </h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Les mots de passe ne sont jamais stockés en texte clair : ils sont hachés localement en SHA-256 (Web Crypto API).</li>
              <li>Toutes les données restent sur ce poste (stockage local), aucune transmission Internet.</li>
              <li>Le premier compte créé est Administrateur ; il peut gérer les autres comptes sur cette page.</li>
              <li>Pensez à utiliser un mot de passe robuste (10 caractères minimum, majuscules, chiffres et symboles).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal nouvel utilisateur */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nouvel utilisateur">
        <form onSubmit={submitAddUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom d'utilisateur" required>
              <input
                className={inputCls}
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                autoFocus
              />
            </Field>
            <Field label="Nom complet" required>
              <input
                className={inputCls}
                value={addForm.nom_complet}
                onChange={(e) => setAddForm({ ...addForm, nom_complet: e.target.value })}
              />
            </Field>
            <Field label="Mot de passe" required>
              <PasswordInput
                value={addForm.password}
                onChange={(v) => setAddForm({ ...addForm, password: v })}
              />
            </Field>
            <Field label="Confirmer le mot de passe" required>
              <PasswordInput
                value={addForm.confirm}
                onChange={(v) => setAddForm({ ...addForm, confirm: v })}
              />
            </Field>
            <Field label="Rôle">
              <select
                className={inputCls}
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {addErr && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{addErr}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              Créer le compte
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal réinitialisation mot de passe */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={resetTarget ? `Réinitialiser — @${resetTarget.username}` : ''}
        size="sm"
      >
        <form onSubmit={submitReset} className="space-y-4">
          <Field label="Nouveau mot de passe" required>
            <PasswordInput
              value={resetForm.password}
              onChange={(v) => setResetForm({ ...resetForm, password: v })}
              autoFocus
            />
          </Field>
          <Field label="Confirmer le mot de passe" required>
            <PasswordInput
              value={resetForm.confirm}
              onChange={(v) => setResetForm({ ...resetForm, confirm: v })}
            />
          </Field>
          {resetErr && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{resetErr}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
