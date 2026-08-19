/*
 * fileSystemService — Abstraction pour la gestion des fichiers locaux.
 *
 * Dans la version Web (navigateur), les capacités sont limitées par les restrictions
 * de sécurité du navigateur. Les fonctions marquées "Desktop uniquement" sont des
 * stubs qui indiquent clairement la limitation et préparent l'architecture pour
 * la future version Desktop (Tauri ou Electron).
 *
 * PRINCIPE FONDAMENTAL : Aucun fichier n'est JAMAIS copié, uploadé ou dupliqué.
 * Seul le chemin du fichier original est enregistré.
 */

export interface SelectedFile {
  nom: string;
  extension: string;
  taille: number;
  typeMime: string;
  chemin: string;
}

export interface FileCheckResult {
  existe: boolean;
  message: string;
}

class FileSystemService {
  /**
   * Sélectionne un fichier via le sélecteur de fichiers du navigateur.
   * En mode Web, le navigateur ne donne accès qu'au nom du fichier et à son contenu,
   * mais PAS au chemin complet (restriction de sécurité).
   *
   * En version Desktop (Tauri/Electron), cette fonction retournera le chemin complet.
   */
  async selectFile(): Promise<SelectedFile | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      // Pas de restriction d'extension — on accepte tous les fichiers techniques
      input.accept = '';
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const nom = file.name;
        const ext = nom.split('.').pop()?.toLowerCase() ?? '';
        resolve({
          nom,
          extension: ext,
          taille: file.size,
          typeMime: file.type || '',
          // En mode Web, le navigateur ne donne PAS le chemin complet.
          // On utilise le nom du fichier comme référence.
          // En version Desktop, on utilisera le chemin réel (ex: D:\PROJETS\TOPO\LEVE.dwg)
          chemin: nom,
        });
      };
      input.click();
    });
  }

  /**
   * Demande à l'utilisateur de saisir manuellement le chemin complet du fichier.
   * Cette fonction est utilisée car le navigateur ne peut pas lire le chemin local.
   * En version Desktop, le chemin sera obtenu automatiquement via selectFile().
   */
  async selectFilePath(): Promise<string | null> {
    return new Promise((resolve) => {
      const input = window.prompt(
        'Saisissez le chemin complet du fichier :\n\nExemple : D:\\PROJETS\\2026\\TOPO\\LOT_A\\LEVE.dwg\n\nLe fichier ne sera PAS copié. Seul son chemin sera enregistré.'
      );
      resolve(input?.trim() || null);
    });
  }

  /**
   * Ouvre le fichier original avec l'application associée par le système d'exploitation.
   *
   * DESKTOP UNIQUEMENT — Le navigateur ne peut pas lancer d'applications locales.
   * En version Desktop (Tauri/Electron), cette fonction utilisera :
   *   - Tauri: `shell.open(path)`
   *   - Electron: `shell.openPath(path)`
   */
  async openFile(localPath: string): Promise<{ success: boolean; message: string }> {
    // En mode Web, on ne peut pas ouvrir un fichier local directement.
    // On affiche le chemin pour que l'utilisateur puisse l'ouvrir manuellement.
    return {
      success: false,
      message:
        'L\'ouverture directe du fichier nécessite la version Desktop (Tauri/Electron).\n\n' +
        'Chemin du fichier :\n' + localPath + '\n\n' +
        'Vous pouvez ouvrir ce fichier manuellement depuis l\'Explorateur Windows.',
    };
  }

  /**
   * Ouvre l'Explorateur Windows sur le dossier contenant le fichier.
   *
   * DESKTOP UNIQUEMENT — Le navigateur ne peut pas lancer l'Explorateur.
   * En version Desktop (Tauri/Electron), cette fonction utilisera :
   *   - Tauri: `shell.open(folderPath)` avec extraction du dossier
   *   - Electron: `shell.showItemInFolder(path)`
   */
  async openFolder(localPath: string): Promise<{ success: boolean; message: string }> {
    const folder = this.extractFolder(localPath);
    return {
      success: false,
      message:
        'L\'ouverture de l\'emplacement nécessite la version Desktop (Tauri/Electron).\n\n' +
        'Dossier du fichier :\n' + folder + '\n\n' +
        'Vous pouvez ouvrir ce dossier manuellement dans l\'Explorateur Windows.',
    };
  }

  /**
   * Vérifie si le fichier existe à l'emplacement enregistré.
   *
   * En mode Web, le navigateur ne peut pas vérifier l'existence d'un fichier local.
   * En version Desktop, cette fonction utilisera les API natives (fs.existsSync).
   */
  async fileExists(localPath: string): Promise<FileCheckResult> {
    // En mode Web, on ne peut pas vérifier l'existence d'un fichier local.
    return {
      existe: false,
      message:
        'La vérification de l\'existence du fichier nécessite la version Desktop (Tauri/Electron).\n\n' +
        'Chemin enregistré :\n' + localPath,
    };
  }

  /**
   * Modifie le chemin d'un fichier (si l'utilisateur a déplacé le fichier).
   * Demande le nouveau chemin via une boîte de dialogue.
   * NE COPIE PAS le fichier — modifie uniquement la référence.
   */
  async updateFilePath(ancienChemin: string): Promise<string | null> {
    const nouveauChemin = window.prompt(
      'Modifier le chemin du fichier :\n\nAncien chemin :\n' + ancienChemin + '\n\n' +
      'Nouveau chemin complet :\n\n' +
      'Exemple : E:\\ARCHIVES\\PROJET_A\\PLAN.dwg\n\n' +
      'Le fichier ne sera PAS copié. Seul le chemin sera mis à jour.'
    );
    return nouveauChemin?.trim() || null;
  }

  /**
   * Extrait le dossier parent d'un chemin de fichier.
   */
  extractFolder(path: string): string {
    const separators = /[\\/]/;
    const parts = path.split(separators);
    parts.pop();
    return parts.join('\\') || path;
  }

  /**
   * Extrait l'extension d'un nom de fichier ou d'un chemin.
   */
  extractExtension(path: string): string {
    const nom = path.split(/[\\/]/).pop() ?? path;
    return nom.split('.').pop()?.toLowerCase() ?? '';
  }

  /**
   * Extrait le nom du fichier d'un chemin complet.
   */
  extractFileName(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
  }
}

export const fileSystemService = new FileSystemService();
