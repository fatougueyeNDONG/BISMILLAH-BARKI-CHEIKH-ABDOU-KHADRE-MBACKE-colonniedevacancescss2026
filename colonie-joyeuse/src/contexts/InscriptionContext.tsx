import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Enfant, AppSettings, DEFAULT_SETTINGS, Parent, HistoriqueEntry } from '@/data/mockData';

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
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

type DemandeApi = {
  id: number;
  liste_code: 'PRINCIPALE' | 'ATTENTE_N1' | 'ATTENTE_N2';
  date_inscription: string;
  statut: 'SOUMISE' | 'RETENUE' | 'NON_VALIDEE' | 'DESISTEE';
  non_validation_reason?: string | null;
  enfant_id: number;
  enfant_prenom: string;
  enfant_nom: string;
  enfant_date_naissance: string;
  enfant_sexe: 'M' | 'F';
  enfant_lien_parente: 'PERE' | 'MERE' | 'TUTEUR_LEGAL' | 'AUTRE';
  enfant_is_titulaire: boolean;
};

const apiListeToLocal = (code: DemandeApi['liste_code']): Enfant['liste'] => {
  if (code === 'ATTENTE_N1') return 'attente_n1';
  if (code === 'ATTENTE_N2') return 'attente_n2';
  return 'principale';
};

const localListeToApi = (code: Enfant['liste']): DemandeApi['liste_code'] => {
  if (code === 'attente_n1') return 'ATTENTE_N1';
  if (code === 'attente_n2') return 'ATTENTE_N2';
  return 'PRINCIPALE';
};

const apiLienToLocal = (lien: DemandeApi['enfant_lien_parente']): Enfant['lienParente'] => {
  if (lien === 'PERE') return 'Père';
  if (lien === 'MERE') return 'Mère';
  if (lien === 'TUTEUR_LEGAL') return 'Tuteur légal';
  return 'Autre';
};

const localLienToApi = (lien: Enfant['lienParente']): DemandeApi['enfant_lien_parente'] => {
  if (lien === 'Père') return 'PERE';
  if (lien === 'Mère') return 'MERE';
  if (lien === 'Tuteur légal') return 'TUTEUR_LEGAL';
  return 'AUTRE';
};

const statutFromApi = (demande: DemandeApi): Enfant['statut'] => {
  if (demande.enfant_is_titulaire || demande.liste_code === 'PRINCIPALE') return 'Titulaire';
  if (demande.liste_code === 'ATTENTE_N1') return 'Suppléant N1';
  return 'Suppléant N2';
};

const validationFromApi = (demande: DemandeApi): Enfant['validation'] => {
  if (demande.statut === 'RETENUE') return 'validé';
  if (demande.statut === 'NON_VALIDEE') return 'refusé';
  return 'en_attente';
};

const mapDemandeToEnfant = (demande: DemandeApi, parentMatricule: string): Enfant => ({
  id: String(demande.id),
  parentMatricule,
  prenom: demande.enfant_prenom,
  nom: demande.enfant_nom,
  dateNaissance: demande.enfant_date_naissance,
  sexe: demande.enfant_sexe,
  lienParente: apiLienToLocal(demande.enfant_lien_parente),
  liste: apiListeToLocal(demande.liste_code),
  statut: statutFromApi(demande),
  dateInscription: demande.date_inscription,
  desistement: demande.statut === 'DESISTEE' ? 'validé' : null,
  validation: validationFromApi(demande),
  motifRefus: demande.non_validation_reason || undefined,
});

export function InscriptionProvider({ children }: { children: ReactNode }) {
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);

  const getToken = () => localStorage.getItem('access_token');
  const getParentMatricule = () => localStorage.getItem('parent_matricule') || '';

  const apiFetch = async (path: string, init?: RequestInit) => {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.detail || `Erreur API (${response.status})`);
    }
    return response;
  };

  const refreshDemandes = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await apiFetch('/parent/demandes');
      const data = (await response.json()) as DemandeApi[];
      const matricule = getParentMatricule();
      setEnfants(data.map((d) => mapDemandeToEnfant(d, matricule)));
      if (matricule) {
        setParents((prev) => {
          if (prev.some((p) => p.matricule === matricule)) return prev;
          return [...prev, { matricule, prenom: '', nom: '', service: '', motDePasse: '', premiereConnexion: false }];
        });
      }
    } catch {
      // Ignore fetch errors here; login flow handles access issues.
    }
  };

  useEffect(() => {
    void refreshDemandes();
    void (async () => {
      try {
        const res = await apiFetch('/admin/settings');
        const remote = await res.json();
        setSettings((prev) => ({ ...prev, ...remote }));
      } catch {
        // Keep defaults when settings endpoint is unavailable.
      }
    })();
  }, []);

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
    void (async () => {
      try {
        const parentMatricule = enfant.parentMatricule || getParentMatricule() || 'INCONNU';
        await apiFetch('/parent/inscriptions', {
          method: 'POST',
          body: JSON.stringify({
            parent: {
              matricule: parentMatricule,
              prenom: 'Parent',
              nom: 'CSS',
              service: 'CSS',
            },
            enfant: {
              prenom: enfant.prenom,
              nom: enfant.nom,
              date_naissance: enfant.dateNaissance,
              sexe: enfant.sexe,
              lien_parente: localLienToApi(enfant.lienParente),
            },
          }),
        });
        await refreshDemandes();
      } catch {
        // Keep local state even if backend call fails.
      }
    })();
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
    void (async () => {
      const enfantIdNum = Number(enfantId);
      if (!Number.isFinite(enfantIdNum)) return;
      try {
        await apiFetch('/parent/titulaire', {
          method: 'POST',
          body: JSON.stringify({ enfant_id_titulaire: enfantIdNum }),
        });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
  };

  const demanderDesistement = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: 'demandé' as const, dateDesistement: new Date().toISOString().split('T')[0] } : e));
    void (async () => {
      const demandeId = Number(enfantId);
      if (!Number.isFinite(demandeId)) return;
      try {
        await apiFetch(`/parent/desistement/${demandeId}`, {
          method: 'POST',
          body: JSON.stringify({ reason: null }),
        });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
  };

  const annulerDesistement = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: null, dateDesistement: undefined } : e));
    void (async () => {
      const demandeId = Number(enfantId);
      if (!Number.isFinite(demandeId)) return;
      try {
        await apiFetch(`/parent/desistement/${demandeId}/annuler`, { method: 'POST' });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
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
    void (async () => {
      const demandeId = Number(enfantId);
      if (!Number.isFinite(demandeId)) return;
      try {
        await apiFetch(`/parent/desistement/${demandeId}/reinscrire`, { method: 'POST' });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
  };

  const validerEnfant = (enfantId: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, validation: 'validé' as const } : e));
    void (async () => {
      const demandeId = Number(enfantId);
      if (!Number.isFinite(demandeId)) return;
      try {
        await apiFetch(`/admin/demandes/${demandeId}/selection-finale`, {
          method: 'POST',
          body: JSON.stringify({ is_selection_finale: true }),
        });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
  };

  const refuserEnfant = (enfantId: string, motif: string) => {
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, validation: 'refusé' as const, motifRefus: motif } : e));
    void (async () => {
      const demandeId = Number(enfantId);
      if (!Number.isFinite(demandeId)) return;
      try {
        await apiFetch(`/admin/demandes/${demandeId}/selection-finale`, {
          method: 'POST',
          body: JSON.stringify({ is_selection_finale: false, non_validation_reason: motif }),
        });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
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
    void (async () => {
      const demandeId = Number(enfantId);
      if (!Number.isFinite(demandeId)) return;
      try {
        await apiFetch(`/admin/demandes/${demandeId}/transferer`, {
          method: 'POST',
          body: JSON.stringify({ to_liste_code: localListeToApi(nouvelleListe), reason: null }),
        });
        await refreshDemandes();
      } catch {
        // Local fallback already applied.
      }
    })();
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
