import { Home, FolderOpen, Users, FileText, Wallet, Clock3, Scale, FlaskConical, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  current: string;
  onNavigate: (page: string) => void;
}

type NavItem = { id: string; label: string; icon: typeof Home };

const groups: { title: string; items: NavItem[] }[] = [
  { title: "Accueil", items: [
    { id: "dashboard", label: "Tableau de bord", icon: Home },
    { id: "dossiers", label: "Dossiers", icon: FolderOpen },
    { id: "clients", label: "Clients", icon: Users },
    { id: "documents", label: "Documents", icon: FileText },
  ] },
  { title: "Expertise & technique", items: [
    { id: "expertises", label: "Expertises judiciaires", icon: Scale },
    { id: "laboratoire", label: "Laboratoire", icon: FlaskConical },
  ] },
  { title: "Finance", items: [
    { id: "paiements", label: "Paiements", icon: Wallet },
    { id: "echeances", label: "Échéances", icon: Clock3 },
  ] },
  { title: "Système", items: [{ id: "parametres", label: "Paramètres", icon: Settings }] },
];

export function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="app-sidebar flex h-full w-[248px] shrink-0 flex-col bg-[#0b1220] text-white">
      <div className="flex h-[82px] items-center border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600 shadow-lg shadow-black/20">
          <span className="text-[15px] font-black tracking-tight text-white">U</span>
        </div>
        <div className="ml-3">
          <div className="text-[15px] font-extrabold tracking-[0.04em]">URATEC</div>
          <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.24em] text-slate-500">Manager</div>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Bureau professionnel</div>
        <div className="mt-1 text-[9px] leading-relaxed text-slate-600">Études · Topographie · Foncier · Architecture · Environnement</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <section key={group.title} className="mb-5">
            <div className="px-3 pb-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500">{group.title}</div>
            <div className="space-y-1">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = current === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={cn(
                      "group flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold transition-all duration-150",
                      active
                        ? "bg-blue-600 text-white shadow-[0_6px_18px_rgba(37,99,235,.24)]"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-slate-200")} />
                    <span className="ml-3 truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.035] p-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <div>
            <div className="text-[10px] font-semibold text-slate-300">Système opérationnel</div>
            <div className="mt-0.5 text-[8px] text-slate-600">URATEC Manager · Desktop</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
