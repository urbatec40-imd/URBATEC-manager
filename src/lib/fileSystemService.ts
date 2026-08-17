// Service de gestion des fichiers pour URATEC MANAGER
// Compatible Web et Desktop - Détection automatique de l'environnement

export interface FileMetadata {
  name: string;
  extension: string;
  size: number;
  lastModified: string;
  path?: string;
}

export interface FileSelectionResult {
  success: boolean;
  file?: FileMetadata;
  error?: string;
  requiresDesktop?: boolean;
}

// Extensions supportées par URATEC
export const extensionsSupportees = [
  // Documents standards
  "PDF", "JPG", "JPEG", "PNG", "DOCX", "XLSX",
  // AutoCAD
  "DWG", "DXF", "DWS", "DWT",
  // Global Mapper
  "GMAP", "GMW", "GMP", "GML",
  // SIG
  "KML", "KMZ", "SHP", "PRJ", "DBF", "SHX", "TAB", "MIF", "MID",
  // Topographie
  "CSV", "TXT", "XYZ", "ASC", "PTS", "JOB", "JXL", "XML", "RAW", "DAT"
];

export const categoriesTechniques = [
  "PLANS AUTOCAD",
  "DONNÉES TOPOGRAPHIQUES",
  "DONNÉES GLOBAL MAPPER",
  "DONNÉES SIG",
  "POINTS TOPOGRAPHIQUES",
  "LEVÉS TOPOGRAPHIQUES",
  "CALCULS TOPOGRAPHIQUES",
  "ORTHOPHOTOS",
  "IMAGES AÉRIENNES",
  "PLANS",
  "CARTOGRAPHIE",
  "RAPPORTS TECHNIQUES"
];

// Détection de l'environnement Tauri
export function isDesktopEnvironment(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).__TAURI__ !== undefined;
}

// Sélection d'un fichier via l'API navigateur
export async function selectFile(): Promise<FileSelectionResult> {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = extensionsSupportees.map(ext => `.${ext.toLowerCase()}`).join(',');
    
    const file = await new Promise<File | null>((resolve) => {
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        resolve(target.files?.[0] || null);
      };
      input.click();
    });
    
    if (file) {
      const metadata: FileMetadata = {
        name: file.name,
        extension: file.name.split('.').pop()?.toUpperCase() || '',
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString(),
      };
      return { success: true, file: metadata };
    }
    
    return { success: false, error: "Aucun fichier sélectionné" };
  } catch (error) {
    return {
      success: false,
      error: "Erreur lors de la sélection du fichier",
      requiresDesktop: true
    };
  }
}

// Ouverture d'un document - Utilise l'API Tauri si disponible, sinon message
export async function openDocument(path: string): Promise<{ success: boolean; error?: string; requiresDesktop?: boolean }> {
  if (isDesktopEnvironment()) {
    try {
      // @ts-ignore - Import dynamique pour Tauri
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke("open_file", { path });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Impossible d'ouvrir le fichier: ${error}`,
        requiresDesktop: true
      };
    }
  }
  
  return {
    success: false,
    error: "L'ouverture de fichiers nécessite la version Desktop (Tauri/Electron).",
    requiresDesktop: true
  };
}

// Ouverture du dossier contenant le fichier
export async function openFolder(path: string): Promise<{ success: boolean; error?: string; requiresDesktop?: boolean }> {
  if (isDesktopEnvironment()) {
    try {
      // @ts-ignore - Import dynamique pour Tauri
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke("open_folder", { path });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Impossible d'ouvrir le dossier: ${error}`,
        requiresDesktop: true
      };
    }
  }
  
  return {
    success: false,
    error: "L'ouverture de l'emplacement nécessite la version Desktop (Tauri/Electron).",
    requiresDesktop: true
  };
}

// Vérification de l'existence d'un fichier
export async function fileExists(path: string): Promise<{ exists: boolean; error?: string; requiresDesktop?: boolean }> {
  if (isDesktopEnvironment()) {
    try {
      // @ts-ignore - Import dynamique pour Tauri
      const { invoke } = await import('@tauri-apps/api/core');
      const exists = await invoke<boolean>("file_exists", { path });
      return { exists };
    } catch (error) {
      return {
        exists: false,
        error: `Erreur de vérification: ${error}`,
        requiresDesktop: true
      };
    }
  }
  
  return {
    exists: false,
    error: "La vérification des fichiers nécessite la version Desktop (Tauri/Electron).",
    requiresDesktop: true
  };
}

// Récupération des métadonnées d'un fichier
export async function getFileMetadata(path: string): Promise<FileMetadata> {
  if (isDesktopEnvironment()) {
    try {
      // @ts-ignore - Import dynamique pour Tauri
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<FileMetadata>("get_file_metadata", { path });
      return result;
    } catch (error) {
      console.error("Erreur lors de la récupération des métadonnées:", error);
    }
  }
  
  return {
    name: path.split(/[\\/]/).pop() || path,
    extension: path.split('.').pop()?.toUpperCase() || '',
    size: 0,
    lastModified: new Date().toISOString(),
    path
  };
}