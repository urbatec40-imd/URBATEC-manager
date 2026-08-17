import { createContext, useContext, useState, ReactNode } from "react";
import { Client, Dossier, Paiement, Expertise, Document, EssaiLaboratoire, Parametres, initialData } from "./db";

interface AppState {
  clients: Client[];
  dossiers: Dossier[];
  paiements: Paiement[];
  expertises: Expertise[];
  documents: Document[];
  laboratoire: EssaiLaboratoire[];
  parametres: Parametres;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: number) => void;
  addDossier: (dossier: Dossier) => void;
  updateDossier: (dossier: Dossier) => void;
  deleteDossier: (id: number) => void;
  addPaiement: (paiement: Paiement) => void;
  deletePaiement: (id: number) => void;
  addExpertise: (expertise: Expertise) => void;
  updateExpertise: (expertise: Expertise) => void;
  deleteExpertise: (id: number) => void;
  addDocument: (document: Document) => void;
  deleteDocument: (id: number) => void;
  addLaboratoire: (essai: EssaiLaboratoire) => void;
  deleteLaboratoire: (id: number) => void;
  updateParametres: (parametres: Parametres) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [dossiers, setDossiers] = useState<Dossier[]>(initialData.dossiers);
  const [paiements, setPaiements] = useState<Paiement[]>(initialData.paiements);
  const [expertises, setExpertises] = useState<Expertise[]>(initialData.expertises);
  const [documents, setDocuments] = useState<Document[]>(initialData.documents);
  const [laboratoire, setLaboratoire] = useState<EssaiLaboratoire[]>(initialData.laboratoire);
  const [parametres, setParametres] = useState<Parametres>(initialData.parametres);

  const addClient = (client: Client) => setClients([...clients, client]);
  const updateClient = (client: Client) => setClients(clients.map((c) => c.id === client.id ? client : c));
  const deleteClient = (id: number) => setClients(clients.filter((c) => c.id !== id));

  const addDossier = (dossier: Dossier) => setDossiers([...dossiers, dossier]);
  const updateDossier = (dossier: Dossier) => setDossiers(dossiers.map((d) => d.id === dossier.id ? dossier : d));
  const deleteDossier = (id: number) => setDossiers(dossiers.filter((d) => d.id !== id));

  const addPaiement = (paiement: Paiement) => {
    setPaiements([...paiements, paiement]);
    const dossier = dossiers.find((d) => d.id === paiement.dossierId);
    if (dossier) {
      const newTotalPaye = dossier.totalPaye + paiement.montant;
      const newReste = dossier.prixTotal - newTotalPaye;
      const newPourcentage = dossier.prixTotal > 0 ? Math.round((newTotalPaye / dossier.prixTotal) * 100) : 0;
      updateDossier({ ...dossier, totalPaye: newTotalPaye, reste: newReste, pourcentagePaiement: newPourcentage });
    }
  };
  const deletePaiement = (id: number) => {
    const paiement = paiements.find((p) => p.id === id);
    if (paiement) {
      const dossier = dossiers.find((d) => d.id === paiement.dossierId);
      if (dossier) {
        const newTotalPaye = Math.max(0, dossier.totalPaye - paiement.montant);
        const newReste = dossier.prixTotal - newTotalPaye;
        const newPourcentage = dossier.prixTotal > 0 ? Math.round((newTotalPaye / dossier.prixTotal) * 100) : 0;
        updateDossier({ ...dossier, totalPaye: newTotalPaye, reste: newReste, pourcentagePaiement: newPourcentage });
      }
      setPaiements(paiements.filter((p) => p.id !== id));
    }
  };

  const addExpertise = (expertise: Expertise) => setExpertises([...expertises, expertise]);
  const updateExpertise = (expertise: Expertise) => setExpertises(expertises.map((e) => e.id === expertise.id ? expertise : e));
  const deleteExpertise = (id: number) => setExpertises(expertises.filter((e) => e.id !== id));

  const addDocument = (document: Document) => setDocuments([...documents, document]);
  const deleteDocument = (id: number) => setDocuments(documents.filter((d) => d.id !== id));

  const addLaboratoire = (essai: EssaiLaboratoire) => setLaboratoire([...laboratoire, essai]);
  const deleteLaboratoire = (id: number) => setLaboratoire(laboratoire.filter((e) => e.id !== id));

  const updateParametres = (newParametres: Parametres) => setParametres(newParametres);

  return (
    <AppContext.Provider value={{
      clients, dossiers, paiements, expertises, documents, laboratoire, parametres,
      addClient, updateClient, deleteClient,
      addDossier, updateDossier, deleteDossier,
      addPaiement, deletePaiement,
      addExpertise, updateExpertise, deleteExpertise,
      addDocument, deleteDocument,
      addLaboratoire, deleteLaboratoire,
      updateParametres,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}