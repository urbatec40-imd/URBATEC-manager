import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Users,
  CreditCard,
  Settings,
  Building2,
  LogOut,
  MapPinned,
  Palette,
  Sun,
  Moon,
  Monitor,
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
  | 'topographie'
  | 'parametres';

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  open: boolean;
  onClose: () => void;
  session: Session | null;
  onLogout: () => void;
}

type ThemeId = 'uratec' | 'slate' | 'emerald' | 'dark';
type ModeId = 'light' | 'dark' | 'system';

const NAV: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { key: 'dossiers', label: 'Nouveau dossier', icon: PlusCircle },
  { key: 'dossiers', label: 'Dossiers', icon: FolderKanban },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'paiements', label: 'Paiements', icon: CreditCard },
  { key: 'topographie', label: 'Topographie', icon: MapPinned },
  { key: 'parametres', label: 'Paramètres', icon: Settings },
];

const THEMES: { id: ThemeId; label: string; accent: string }[] = [
  { id: 'uratec', label: 'URATEC Professional', accent: 'bg-sky-500' },
  { id: 'slate', label: 'Slate', accent: 'bg-slate-500' },
  { id: 'emerald', label: 'Emerald', accent: 'bg-emerald-500' },
  { id: 'dark', label: 'Dark Professional', accent: 'bg-violet-500' },
];

function readStoredTheme(): ThemeId {
  const value = localStorage.getItem('uratec-theme') as ThemeId | null;
  return value && THEMES.some(t => t.id === value) ? value : 'uratec';
}

function readStoredMode(): ModeId {
  const value = localStorage.getItem('uratec-theme-mode') as ModeId | null;
  return value === 'dark' || value === 'system' ? value : 'light';
}

function applyTheme(theme: ThemeId, mode: ModeId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  root.classList.toggle('dark', mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  localStorage.setItem('uratec-theme', theme);
  localStorage.setItem('uratec-theme-mode', mode);
}

function ThemePanel() {
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());
  const [mode, setMode] = useState<ModeId>(() => readStoredMode());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (mode === 'system') applyTheme(theme, mode); };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [mode, theme]);

  return (
    <div className="px-4 py-2 border-t border-slate-700">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
        <Palette size={16} />
        <span className="flex-1 text-left">Apparence</span>
        <span className="text-[10px] text-slate-500">{THEMES.find(t => t.id === theme)?.label}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-600 bg-slate-900/95 p-3 shadow-xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thème</div>
          <div className="mt-2 space-y-1">
            {THEMES.map(item => (
              <button key={item.id} type="button" onClick={() => setTheme(item.id)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left ${theme === item.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className={`h-3 w-3 rounded-full ${item.accent}`} />
                <span className="flex-1">{item.label}</span>
                {theme === item.id && <span>✓</span>}
              </button>
            ))}
          </div>
          <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Mode</div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {([['light', Sun, 'Clair'], ['dark', Moon, 'Sombre'], ['system', Monitor, 'Système']] as const).map(([id, Icon, label]) => (
              <button key={id} type="button" onClick={() => setMode(id)} className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] ${mode === id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ current, onNavigate, open, onClose, session, onLogout }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-800 text-slate-100 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none" style={{ transform: open ? 'translateX(0)' : undefined }}>
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg"><Building2 size={22} className="text-white" /></div>
            <div><h1 className="font-bold text-white text-lg leading-tight">URATEC</h1><p className="text-[10px] text-slate-400 leading-tight">MANAGER</p></div>
          </div>
          <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">Bureau d'études • Topographie • Foncier • Architecture • Environnement</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map(({ key, label, icon: Icon }, index) => {
            const active = current === key;
            return <button key={`${key}-${index}`} onClick={() => { onNavigate(key); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${active ? 'bg-sky-600 text-white border-l-4 border-sky-300 shadow-inner' : 'text-slate-300 hover:bg-slate-700 hover:text-white border-l-4 border-transparent'}`}><Icon size={18} /><span>{label}</span></button>;
          })}
        </nav>
        <ThemePanel />
        {session && <div className="px-4 py-3 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-bold">{(session.nom_complet || session.username || 'U').charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{session.nom_complet || session.username || 'Utilisateur'}</p><p className="text-[10px] text-slate-400">{session.role}</p></div></div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-red-600 hover:text-white transition-colors"><LogOut size={16} />Se déconnecter</button>
        </div>}
        <div className="px-5 py-3 border-t border-slate-700 text-[10px] text-slate-500">URATEC Manager V0 — © {new Date().getFullYear()}</div>
      </aside>
    </>
  );
}
