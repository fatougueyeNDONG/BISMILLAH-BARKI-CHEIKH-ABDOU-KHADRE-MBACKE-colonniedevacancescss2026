import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Enfant, MOCK_ENFANTS, MOCK_PARENTS, MOCK_HISTORIQUE, AppSettings, DEFAULT_SETTINGS, Parent, HistoriqueEntry } from '@/data/mockData';

interface InscriptionContextType {
  enfants: Enfant[];
  parents: Parent[];
  settings: AppSettings;
  historique: HistoriqueEntry[];
  updateSettings: (s: Partial<AppSettings>) => void;
  addEnfant: (enfant: Enfant) => void;
  updateEnfant: (id: string, updates: Partial<Enfant>) => void;
  removeEnfant: (id: string) => void;
  getEnfantsByParent: (matricule: string) => Enfant[];
  getEnfantsByListe: (liste: Enfant['liste']) => Enfant[];
  setTitulaire: (matricule: string, enfantId: string) => void;
  demanderDesistement: (enfantId: string) => void;
  annulerDesistement: (enfantId: string) => void;
  validerDesistement: (enfantId: string) => void;
  reinscrireEnfant: (enfantId: string) => void;
  transfererEnfant: (enfantId: string, nouvelleListe: Enfant['liste']) => void;
  getListeFinale: () => Enfant[];
  getRangDansListe: (enfantId: string) => number;
  addParent: (parent: Parent) => void;
  updateParent: (matricule: string, updates: Partial<Parent>) => void;
  removeParent: (matricule: string) => void;
  validerEnfant: (enfantId: string) => void;
  refuserEnfant: (enfantId: string, motif: string) => void;
  getEnfantsDesistesFinale: () => Enfant[];
  addHistorique: (entry: Omit<HistoriqueEntry, 'id' | 'date' | 'heure'>) => void;
  isListeFinaleComplete: () => boolean;
}

const InscriptionContext = createContext<InscriptionContextType | undefined>(undefined);

export function InscriptionProvider({ children }: { children: ReactNode }) {
  const [enfants, setEnfants] = useState<Enfant[]>([...MOCK_ENFANTS]);
  const [parents, setParents] = useState<Parent[]>([...MOCK_PARENTS]);
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([...MOCK_HISTORIQUE]);

  const updateSettings = (s: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
  };

  const addHistorique = (entry: Omit<HistoriqueEntry, 'id' | 'date' | 'heure'>) => {
    const now = new Date();
    setHistorique(prev => [{
      ...entry,
      id: `h_${Date.now()}`,
      date: now.toISOString().split('T')[0],
      heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev]);
  };

  const addEnfant = (enfant: Enfant) => {
    setEnfants(prev => [...prev, enfant]);
  };

  const updateEnfant = (id: string, updates: Partial<Enfant>) => {
    setEnfants(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeEnfant = (id: string) => {
    setEnfants(prev => prev.filter(e => e.id !== id));
  };

  const getEnfantsByParent = (matricule: string) => {
    return enfants.filter(e => e.parentMatricule === matricule);
  };

  const getEnfantsByListe = (liste: Enfant['liste']) => {
    return enfants
      .filter(e => e.liste === liste)
      .sort((a, b) => new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime());
  };

  const setTitulaire = (matricule: string, enfantId: string) => {
    setEnfants(prev => {
      const parentEnfants = prev.filter(e => e.parentMatricule === matricule);
      const others = prev.filter(e => e.parentMatricule !== matricule);
      const updated = parentEnfants.map(e => {
        if (e.id === enfantId) {
          return { ...e, liste: 'principale' as const, statut: 'Titulaire' as const };
        }
        if (e.liste === 'principale' && e.statut === 'Titulaire') {
          if (e.lienParente === 'Autre') {
            return { ...e, liste: 'attente_n2' as const, statut: 'Suppléant N2' as const };
          }
          return { ...e, liste: 'attente_n1' as const, statut: 'Suppléant N1' as const };
        }
        return e;
      });
      return [...others, ...updated];
    });
  };

  const demanderDesistement = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: 'demandé' as const, dateDesistement: new Date().toISOString().split('T')[0] } : e));
  };

  const annulerDesistement = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: null, dateDesistement: undefined } : e));
  };

  const validerDesistement = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: 'validé' as const } : e));
  };

  const reinscrireEnfant = (enfantId: string) => {
    setEnfants(prev => {
      const enfant = prev.find(e => e.id === enfantId);
      if (!enfant) return prev;
      // Use full ISO timestamp to guarantee ordering after all existing entries
      const now = new Date();
      const newDateInscription = now.toISOString();
      return prev.map(e => {
        if (e.id !== enfantId) return e;
        return {
          ...e,
          desistement: null,
          dateDesistement: undefined,
          validation: 'en_attente' as const,
          reinscrit: true,
          dateInscription: newDateInscription,
        };
      });
    });
  };

  const validerEnfant = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, validation: 'validé' as const } : e));
  };

  const refuserEnfant = (enfantId: string, motif: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, validation: 'refusé' as const, motifRefus: motif } : e));
  };

  const transfererEnfant = (enfantId: string, nouvelleListe: Enfant['liste']) => {
    const statutMap: Record<string, string> = {
      principale: 'Titulaire',
      attente_n1: 'Suppléant N1',
      attente_n2: 'Suppléant N2',
    };
    const newDateInscription = new Date().toISOString();
    setEnfants(prev => prev.map(e =>
      e.id === enfantId
        ? { ...e, liste: nouvelleListe, statut: statutMap[nouvelleListe] as any, dateInscription: newDateInscription }
        : e
    ));
  };

  const getRangDansListe = (enfantId: string) => {
    const enfant = enfants.find(e => e.id === enfantId);
    if (!enfant) return 0;
    const listeEnfants = enfants
      .filter(e => e.liste === enfant.liste)
      .sort((a, b) => new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime());
    return listeEnfants.findIndex(e => e.id === enfantId) + 1;
  };

  const getListeFinale = () => {
    const sortByDate = (a: Enfant, b: Enfant) =>
      new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime();

    const validated = enfants
      .filter(e => e.validation === 'validé' && e.desistement !== 'validé')
      .sort(sortByDate);

    if (settings.capaciteMax === null) return validated;
    return validated.slice(0, settings.capaciteMax);
  };

  const isListeFinaleComplete = () => {
    if (settings.capaciteMax === null) return false;
    const listeFinale = getListeFinale();
    return listeFinale.length >= settings.capaciteMax;
  };

  const getEnfantsDesistesFinale = () => {
    return enfants
      .filter(e => e.validation === 'validé' && (e.desistement === 'demandé' || e.desistement === 'validé'))
      .sort((a, b) => new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime());
  };

  const addParent = (parent: Parent) => {
    setParents(prev => [...prev, parent]);
  };

  const updateParent = (matricule: string, updates: Partial<Parent>) => {
    setParents(prev => prev.map(p => p.matricule === matricule ? { ...p, ...updates } : p));
  };

  const removeParent = (matricule: string) => {
    setParents(prev => prev.filter(p => p.matricule !== matricule));
  };

  return (
    <InscriptionContext.Provider value={{
      enfants, parents, settings, historique, updateSettings,
      addEnfant, updateEnfant, removeEnfant,
      getEnfantsByParent, getEnfantsByListe,
      setTitulaire, demanderDesistement, annulerDesistement, validerDesistement, reinscrireEnfant,
      transfererEnfant, getListeFinale, getRangDansListe,
      addParent, updateParent, removeParent,
      validerEnfant, refuserEnfant, getEnfantsDesistesFinale,
      addHistorique, isListeFinaleComplete,
    }}>
      {children}
    </InscriptionContext.Provider>
  );
}

export function useInscription() {
  const ctx = useContext(InscriptionContext);
  if (!ctx) throw new Error('useInscription must be used within InscriptionProvider');
  return ctx;
}
