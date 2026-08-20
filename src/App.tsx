import { useState } from "react";
import { Home, FolderOpen, Users, FileText, Wallet, Clock, Scale, FlaskConical, Settings, Map } from "lucide-react";
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
import { Topographie } from "@/components/Topographie";

type Page = "dashboard" | "dossiers" | "clients" | "documents" | "paiements" | "echeances" | "expertises" | "laboratoire" | "topographie" | "parametres";

const navigation = [
  { id: "dashboard" as Page, label: "TABLEAU DE BORD", icon: Home },
  { id: "dossiers" as Page, label: "DOSSIERS", icon: FolderOpen },
  { id: "clients" as Page, label: "CLIENTS", icon: Users },
  { id: "documents" as Page, label: "DOCUMENTS", icon: FileText },
  { id: "paiements" as Page, label: "PAIEMENTS", icon: Wallet },
  { id: "echeances" as Page, label: "ÉCHÉANCES", icon: Clock },
  { id: "expertises" as Page, label: "EXPERTISES JUDICIAIRES", icon: Scale },
  { id: "laboratoire" as Page, label: "LABORATOIRE", icon: FlaskConical },
  { id: "topographie" as Page, label: "TOPOGRAPHIE", icon: Map },
  { id: "parametres" as Page, label: "PARAMÈTRES", icon: Settings },
];

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6">
          <h1 className="font-serif text-2xl font-bold text-slate-900">URATEC</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Manager</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500">BUREAU D'ÉTUDES • TOPOGRAPHIE • FONCIER</p>
          <p className="text-xs text-slate-500">ARCHITECTURE • ENVIRONNEMENT</p>
          <p className="text-xs text-slate-500">LABORATOIRE • EXPERTISES JUDICIAIRES</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {currentPage === "dashboard" && <Dashboard />}
        {currentPage === "dossiers" && <Dossiers />}
        {currentPage === "clients" && <Clients />}
        {currentPage === "paiements" && <Paiements />}
        {currentPage === "echeances" && <Echeances />}
        {currentPage === "expertises" && <Expertises />}
        {currentPage === "documents" && <Documents />}
        {currentPage === "laboratoire" && <Laboratoire />}
        {currentPage === "topographie" && <Topographie />}
        {currentPage === "parametres" && <Parametres />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
