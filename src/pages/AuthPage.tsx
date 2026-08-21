import { useState } from 'react';
import { Building2, LogIn, UserPlus, Lock, User as UserIcon, MailQuestion } from 'lucide-react';
import * as authService from '@/services/authService';
import * as passwordResetService from '@/services/passwordResetService';
import type { Session } from '@/types';

interface AuthPageProps {
  onAuth: (session: Session) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [nomComplet, setNomComplet] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const hasUsers = authService.hasUsers();

  function changeMode(next: AuthMode) {
    setMode(next);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        await passwordResetService.requestPasswordReset(username);
        setSuccess('La demande a été envoyée à l’adresse de récupération enregistrée. Vérifiez votre boîte Email.');
        return;
      }

      if (mode === 'login') {
        const session = await authService.login(username, password);
        onAuth(session);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas');
        }
        if (password.length < 4) {
          throw new Error('Le mot de passe doit faire au moins 4 caractères');
        }
        const isFirstUser = !authService.hasUsers();
        const session = await authService.signup(
          username,
          nomComplet,
          password,
          isFirstUser ? 'Administrateur' : 'Utilisateur'
        );
        onAuth(session);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">URATEC MANAGER</h1>
          <p className="text-sm text-slate-400 mt-1">Bureau d'Études</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode !== 'forgot' ? (
            <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
              <button type="button" onClick={() => changeMode('login')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <LogIn size={16} /> Se connecter
              </button>
              <button type="button" onClick={() => changeMode('signup')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <UserPlus size={16} /> Créer un compte
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-6 text-sky-700"><MailQuestion size={20}/><h2 className="font-bold">Mot de passe oublié</h2></div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom d'utilisateur</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required autoFocus className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" placeholder="Votre nom d'utilisateur" />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
                <input type="text" value={nomComplet} onChange={e => setNomComplet(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" placeholder="Nom et prénom" />
              </div>
            )}

            {mode !== 'forgot' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" placeholder="••••••••" />
                  </div>
                </div>
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" placeholder="••••••••" />
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            {success && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{success}</p>}

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Veuillez patienter...' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer le compte' : 'Envoyer le code de récupération'}
            </button>
          </form>

          {mode === 'login' && (
            <button type="button" onClick={() => changeMode('forgot')} className="w-full mt-4 text-sm text-sky-700 hover:text-sky-900 font-medium">
              Mot de passe oublié ?
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" onClick={() => changeMode('login')} className="w-full mt-4 text-sm text-slate-600 hover:text-slate-900">
              Retour à la connexion
            </button>
          )}

          {mode === 'login' && !hasUsers && <p className="text-xs text-gray-500 text-center mt-4">Aucun compte n'existe encore. Créez le premier compte pour commencer.</p>}
          {mode === 'signup' && <p className="text-xs text-gray-500 text-center mt-4">Le premier compte créé devient automatiquement Administrateur.</p>}
          {mode === 'forgot' && <p className="text-xs text-gray-500 text-center mt-4">La récupération fonctionne uniquement avec Internet et une adresse Email de récupération enregistrée.</p>}
        </div>
      </div>
    </div>
  );
}
