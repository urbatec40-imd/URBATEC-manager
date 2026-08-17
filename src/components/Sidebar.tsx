import { LayoutDashboard, FolderOpen, Users, FileText, Wallet, Clock, Scale, FlaskConical, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  current: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: "dashboard", label: "TABLEAU DE BORD", icon: LayoutDashboard },
  { id: "dossiers", label: "DOSSIERS", icon: FolderOpen },
  { id: "clients", label: "CLIENTS", icon: Users },
  { id: "documents", label: "DOCUMENTS", icon: FileText },
  { id: "paiements", label: "PAIEMENTS", icon: Wallet },
  { id: "echeances", label: "ÉCHÉANCES", icon: Clock },
  { id: "expertises", label: "EXPERTISES JUDICIAIRES", icon: Scale },
  { id: "laboratoire", label: "LABORATOIRE", icon: FlaskConical },
  { id: "parametres", label: "PARAMÈTRES", icon: Settings },
];

export function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 p-6">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-white">URATEC</h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Manager</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-500">URATEC Manager V0</p>
        <p className="text-xs text-slate-600">Bureau d'études et d'expertises</p>
      </div>
    </aside>
  );
}