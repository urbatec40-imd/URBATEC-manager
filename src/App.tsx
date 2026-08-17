import { useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Home, FolderOpen, Users, FileText, Wallet, Clock, Scale, FlaskConical, Settings, Search } from "lucide-react";
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

type Page = "dashboard" | "dossiers" | "clients" | "documents" | "paiements" | "echeances" | "expertises" | "laboratoire" | "parametres";

const navigation = [
  { id: "dashboard" as Page, label: "Tableau de bord", icon: Home },
  { id: "dossiers" as Page, label: "Dossiers", icon: FolderOpen },
  { id: "clients" as Page, label: "Clients", icon: Users },
  { id: "documents" as Page, label: "Documents", icon: FileText },
  { id: "paiements" as Page, label: "Paiements", icon: Wallet },
  { id: "echeances" as Page, label: "Échéances", icon: Clock },
  { id: "expertises" as Page, label: "Expertises judiciaires", icon: Scale },
  { id: "laboratoire" as Page, label: "Laboratoire", icon: FlaskConical },
];

const systemNavigation = [{ id: "parametres" as Page, label: "Paramètres", icon: Settings }];

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const pageTitle = navigation.concat(systemNavigation).find((item) => item.id === currentPage)?.label ?? "Tableau de bord";

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-[#f6f8fb] text-slate-900">
      <aside className={`app-sidebar relative flex shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ${collapsed ? "w-[82px]" : "w-[270px]"}`}>
        <div className="flex h-[86px] items-center border-b border-slate-100 px-5">
          <div className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black tracking-tight text-white shadow-lg shadow-slate-900/10">U</div>
          {!collapsed && <div className="ml-3 min-w-0"><div className="text-[17px] font-extrabold tracking-tight text-slate-950">URATEC</div><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Manager</div></div>}
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-[74px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50" aria-label="Réduire le menu">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          {!collapsed && <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Activité</div>}
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return <button key={item.id} title={collapsed ? item.label : undefined} onClick={() => setCurrentPage(item.id)} className={`group flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-all ${active ? "bg-slate-950 text-white shadow-md shadow-slate-900/10" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`} />{!collapsed && <span className="ml-3 truncate">{item.label}</span>}</button>;
            })}
          </div>
          {!collapsed && <div className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Système</div>}
          <div className="space-y-1">
            {systemNavigation.map((item) => { const Icon = item.icon; const active = currentPage === item.id; return <button key={item.id} title={collapsed ? item.label : undefined} onClick={() => setCurrentPage(item.id)} className={`group flex w-full items-center rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-all ${active ? "bg-slate-950 text-white shadow-md shadow-slate-900/10" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"}`}><Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`} />{!collapsed && <span className="ml-3">{item.label}</span>}</button>; })}
          </div>
        </nav>

        {!collapsed && <div className="border-t border-slate-100 p-4"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-[11px] font-bold text-slate-700">Bureau d'études</div><div className="mt-1 text-[10px] leading-4 text-slate-400">Topographie · Foncier · Architecture · Environnement</div></div></div>}
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/70 bg-white/90 px-5 backdrop-blur-xl md:px-8">
          <div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">URATEC Manager</div><div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{pageTitle}</div></div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex"><Search className="h-4 w-4 text-slate-400" /><span className="text-xs text-slate-400">Rechercher...</span><kbd className="ml-4 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 shadow-sm">Ctrl K</kbd></div>
            <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" /></button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white sm:flex">AD</div>
          </div>
        </header>
        {currentPage === "dashboard" && <Dashboard />}
        {currentPage === "dossiers" && <Dossiers />}
        {currentPage === "clients" && <Clients />}
        {currentPage === "paiements" && <Paiements />}
        {currentPage === "echeances" && <Echeances />}
        {currentPage === "expertises" && <Expertises />}
        {currentPage === "documents" && <Documents />}
        {currentPage === "laboratoire" && <Laboratoire />}
        {currentPage === "parametres" && <Parametres />}
      </main>
    </div>
  );
}

export default function App() { return <AppProvider><AppContent /></AppProvider>; }
