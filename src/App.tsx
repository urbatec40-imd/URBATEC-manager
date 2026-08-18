import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Home, FolderOpen, Users, FileText, Wallet, Clock3, Scale, FlaskConical, Settings, Search, Command, Plus } from "lucide-react";
import { AppProvider } from "@/lib/store";
import { Dashboard } from "@/components/Dashboard";
import { Dossiers } from "@/components/Dossiers";
import { Clients } from "@/components/Clients";
import { Paiements } from "@/components/Paiements";
import { Echeances } from "@/components/Echeances";
import { Expertises } from "@/components/Expertises";
import { Documents } from "@/components/Documents";
import { Laboratoire } from "@/components/Laboratoire";
import { Parametres } from "@/components/Parametres";
import logo from "@/assets/uratec.svg";

type Page = "dashboard" | "dossiers" | "clients" | "documents" | "paiements" | "echeances" | "expertises" | "laboratoire" | "parametres";

type NavItem = { id: Page; label: string; icon: typeof Home };
const activity: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: Home },
  { id: "dossiers", label: "Dossiers", icon: FolderOpen },
  { id: "clients", label: "Clients", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
];
const operations: NavItem[] = [
  { id: "expertises", label: "Expertises judiciaires", icon: Scale },
  { id: "laboratoire", label: "Laboratoire", icon: FlaskConical },
];
const finance: NavItem[] = [
  { id: "paiements", label: "Paiements", icon: Wallet },
  { id: "echeances", label: "Échéances", icon: Clock3 },
];
const system: NavItem[] = [{ id: "parametres", label: "Paramètres", icon: Settings }];

function NavGroup({ title, items, currentPage, collapsed, onNavigate }: { title: string; items: NavItem[]; currentPage: Page; collapsed: boolean; onNavigate: (page: Page) => void }) {
  return <div className="mb-6">
    {!collapsed && <div className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{title}</div>}
    <div className="space-y-1">
      {items.map((item) => { const Icon = item.icon; const active = currentPage === item.id; return <button key={item.id} title={collapsed ? item.label : undefined} onClick={() => onNavigate(item.id)} className={`nav-item group flex w-full items-center rounded-xl text-left transition-all ${collapsed ? "justify-center px-3 py-3" : "px-3 py-2.5"} ${active ? "nav-item-active" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`} />{!collapsed && <span className="ml-3 truncate text-[12px] font-semibold">{item.label}</span>}</button>; })}
    </div>
  </div>;
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const all = [...activity, ...operations, ...finance, ...system];
  const pageTitle = all.find((item) => item.id === currentPage)?.label ?? "Tableau de bord";

  return <div className="app-shell flex h-screen overflow-hidden bg-[#f4f6f9] text-slate-900">
    <aside className={`app-sidebar relative flex shrink-0 flex-col bg-[#0b1220] text-white transition-all duration-300 ${collapsed ? "w-[76px]" : "w-[248px]"}`}>
      <div className={`flex h-[82px] items-center border-b border-white/[0.06] ${collapsed ? "justify-center px-3" : "px-5"}`}>
        <img src={logo} alt="URATEC" className="h-10 w-10 rounded-xl shadow-lg shadow-black/20" />
        {!collapsed && <div className="ml-3"><div className="text-[15px] font-extrabold tracking-[0.04em]">URATEC</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Manager</div></div>}
      </div>
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-[70px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:scale-105" aria-label="Réduire le menu">{collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}</button>
      {!collapsed && <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.045] px-3 py-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10"><Command className="h-3.5 w-3.5 text-slate-300" /></div><div><div className="text-[10px] font-semibold text-slate-300">Recherche rapide</div><div className="text-[9px] text-slate-600">Ctrl K · dossiers, clients...</div></div></div>}
      <nav className="flex-1 overflow-y-auto px-3 py-5"><NavGroup title="Accueil" items={activity} currentPage={currentPage} collapsed={collapsed} onNavigate={setCurrentPage} /><NavGroup title="Expertise & technique" items={operations} currentPage={currentPage} collapsed={collapsed} onNavigate={setCurrentPage} /><NavGroup title="Finance" items={finance} currentPage={currentPage} collapsed={collapsed} onNavigate={setCurrentPage} /><NavGroup title="Système" items={system} currentPage={currentPage} collapsed={collapsed} onNavigate={setCurrentPage} /></nav>
      {!collapsed && <div className="border-t border-white/[0.06] p-4"><div className="rounded-xl border border-white/[0.05] bg-white/[0.035] p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" /><span className="text-[10px] font-semibold text-slate-400">Système opérationnel</span></div><div className="mt-2 text-[9px] text-slate-600">URATEC Manager · Desktop</div></div></div>}
    </aside>

    <main className="min-w-0 flex-1 overflow-y-auto">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-5 backdrop-blur-xl md:px-8">
        <div className="min-w-0"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400"><span>URATEC</span><span className="text-slate-300">/</span><span>{currentPage === "dashboard" ? "Vue générale" : "Espace de travail"}</span></div><div className="mt-1 truncate text-[17px] font-bold tracking-tight text-slate-950">{pageTitle}</div></div>
        <div className="flex items-center gap-2.5"><button className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400 transition hover:border-slate-300 hover:bg-white md:flex"><Search className="h-3.5 w-3.5" /><span className="text-[11px]">Rechercher</span><kbd className="ml-3 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] font-bold text-slate-400">Ctrl K</kbd></button><button className="hidden items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-slate-800 md:flex"><Plus className="h-3.5 w-3.5" /> Nouveau</button><button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500 ring-2 ring-white" /></button><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-[10px] font-extrabold text-white">AD</div></div>
      </header>
      {currentPage === "dashboard" && <Dashboard />}{currentPage === "dossiers" && <Dossiers />}{currentPage === "clients" && <Clients />}{currentPage === "paiements" && <Paiements />}{currentPage === "echeances" && <Echeances />}{currentPage === "expertises" && <Expertises />}{currentPage === "documents" && <Documents />}{currentPage === "laboratoire" && <Laboratoire />}{currentPage === "parametres" && <Parametres />}
    </main>
  </div>;
}

export default function App() { return <AppProvider><AppContent /></AppProvider>; }
