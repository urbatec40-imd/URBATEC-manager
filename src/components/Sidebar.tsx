import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Users,
  CreditCard,
  Settings,
  Building2,
  LogOut,
} from 'lucide-react';
import type { Session } from '@/types';

export type PageKey =
  | 'dashboard'
  | 'dossiers'
  | 'clients'
  | 'documents'
  | 'paiements'
  | 'echeances'
  | 'expertises'
  | 'laboratoire'
  | 'environnement'
  | 'parametres';

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  open: boolean;
  onClose: () => void;
  session: Session | null;
  onLogout: () => void;
}

const NAV: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'dossiers', label: 'Nouveau dossier', icon: PlusCircle },
  { key: 'dossiers', label: 'Dossiers', icon: FolderKanban },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'paiements', label: 'Paiements', icon: CreditCard },
  { key: 'parametres', label: 'Paramètres', icon: Settings },
];

export function Sidebar({ current, onNavigate, open, onClose, session, onLogout }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-800 text-slate-100 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">URATEC</h1>
              <p className="text-[10px] text-slate-400 leading-tight">MANAGER</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">
            Bureau d'études • Topographie • Foncier • Architecture • Environnement
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map(({ key, label, icon: Icon }, index) => {
            const active = current === key;
            return (
              <button
                key={`${key}-${index}`}
                onClick={() => {
                  onNavigate(key);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sky-600 text-white border-l-4 border-sky-300'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {session && (
          <div className="px-4 py-3 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-bold">
                {(session.nom_complet || session.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.nom_complet || session.username || 'Utilisateur'}
                </p>
                <p className="text-[10px] text-slate-400">{session.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Se déconnecter
            </button>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-700 text-[10px] text-slate-500">
          URATEC Manager V0 — © {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
}
