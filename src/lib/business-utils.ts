import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDate(date: string): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: fr });
  } catch {
    return date;
  }
}

export function formatMontant(montant: number): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(montant);
}

export function joursRestants(dateLimite: string): number {
  if (!dateLimite) return 0;
  const limite = new Date(dateLimite);
  const aujourdhui = new Date();
  const diff = limite.getTime() - aujourdhui.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getEtatBadge(etat: string): string {
  switch (etat) {
    case "NOUVEAU":
      return "bg-blue-100 text-blue-800";
    case "EN COURS":
      return "bg-indigo-100 text-indigo-800";
    case "INCOMPLET":
      return "bg-orange-100 text-orange-800";
    case "EN ATTENTE":
      return "bg-yellow-100 text-yellow-800";
    case "TERMINÉ":
      return "bg-green-100 text-green-800";
    case "ANNULÉ":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function getAvancementColor(avancement: number): string {
  if (avancement === 0) return "bg-red-500";
  if (avancement < 100) return "bg-orange-500";
  return "bg-green-500";
}

export function getEtatEcheance(dateLimite: string, etat: string) {
  if (etat === "TERMINÉ") {
    return { label: "TERMINÉ", color: "bg-green-100 text-green-800" };
  }
  const jours = joursRestants(dateLimite);
  if (jours < 0) {
    return { label: "EN RETARD", color: "bg-red-100 text-red-800" };
  }
  if (jours <= 7) {
    return { label: "ÉCHÉANCE PROCHE", color: "bg-orange-100 text-orange-800" };
  }
  return { label: "DANS LES DÉLAIS", color: "bg-green-100 text-green-800" };
}

export function genererNumeroDossier(domaine: string, dossiers: any[]): string {
  const prefixes: Record<string, string> = {
    "Expertise judiciaire": "EXP",
    "Topographie": "TOPO",
    "Foncier agricole": "FA",
    "Foncier urbain": "FU",
    "Architecture": "ARCH",
    "Environnement": "ENV",
    "Laboratoire": "LAB",
  };
  const prefix = prefixes[domaine] || "DOS";
  const annee = new Date().getFullYear();
  const count = dossiers.filter((d) => d.numero.startsWith(`${prefix}-${annee}-`)).length + 1;
  return `${prefix}-${annee}-${String(count).padStart(3, "0")}`;
}

export function getExtensionIcon(extension: string): string {
  const icons: Record<string, string> = {
    PDF: "📄",
    JPG: "🖼️",
    JPEG: "🖼️",
    PNG: "🖼️",
    DOCX: "📝",
    XLSX: "📊",
    DWG: "📐",
    DXF: "📐",
    DWS: "📐",
    DWT: "📐",
    GMAP: "🗺️",
    GMW: "🗺️",
    GMP: "🗺️",
    GML: "🗺️",
    KML: "📍",
    KMZ: "📍",
    SHP: "🗺️",
    PRJ: "🗺️",
    DBF: "🗺️",
    SHX: "🗺️",
    TAB: "🗺️",
    MIF: "🗺️",
    MID: "🗺️",
    CSV: "📊",
    TXT: "📝",
    XYZ: "📐",
    ASC: "📐",
    PTS: "📐",
    JOB: "📐",
    JXL: "📐",
    XML: "📝",
    RAW: "📐",
    DAT: "📐",
  };
  return icons[extension] || "📁";
}