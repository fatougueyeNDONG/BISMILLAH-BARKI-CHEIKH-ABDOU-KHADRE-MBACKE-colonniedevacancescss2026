import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Enfant, AppSettings, Parent, HistoriqueEntry } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';

interface InscriptionContextType {
  enfants: Enfant[];
  parents: Parent[];
  settings: AppSettings;
  historique: HistoriqueEntry[];
  updateSettings: (s: Partial<AppSettings>) => void;
  addEnfant: (enfant: Enfant) => void | Promise<void>;
  updateEnfant: (id: string, updates: Partial<Enfant>) => void;
  removeEnfant: (id: string) => void;
  getEnfantsByParent: (matricule: string) => Enfant[];
  getEnfantsByListe: (liste: Enfant['liste']) => Enfant[];
  setTitulaire: (matricule: string, enfantId: string) => void | Promise<void>;
  demanderDesistement: (enfantId: string) => void | Promise<void>;
  annulerDesistement: (enfantId: string) => void | Promise<void>;
  validerDesistement: (enfantId: string) => void | Promise<void>;
  reinscrireEnfant: (enfantId: string) => void | Promise<void>;
  transfererEnfant: (enfantId: string, nouvelleListe: Enfant['liste']) => void | Promise<void>;
  getListeFinale: () => Enfant[];
  getRangDansListe: (enfantId: string) => number;
  addParent: (parent: Parent) => void;
  updateParent: (matricule: string, updates: Partial<Parent>) => void;
  removeParent: (matricule: string) => void;
  validerEnfant: (enfantId: string) => void | Promise<void>;
  refuserEnfant: (enfantId: string, motif: string) => void | Promise<void>;
  getEnfantsDesistesFinale: () => Enfant[];
  addHistorique: (entry: Omit<HistoriqueEntry, 'id' | 'date' | 'heure'>) => void;
  isListeFinaleComplete: () => boolean;
}

const InscriptionContext = createContext<InscriptionContextType | undefined>(undefined);

const EMPTY_SETTINGS: AppSettings = {
  colonieNom: '',
  dateDebutInscriptions: '',
  dateFinInscriptions: '',
  dateDebutColonie: '',
  dateFinColonie: '',
  capaciteMax: null,
  maxEnfantsParParent: null,
  ageMin: 0,
  ageMax: 0,
  inscriptionsOuvertes: true,
  accesParentsActif: true,
};

export function InscriptionProvider({ children }: { children: ReactNode }) {
  const { token, role, parent: authParent } = useAuth();
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ ...EMPTY_SETTINGS });
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [desistementByDemandeId, setDesistementByDemandeId] = useState<Record<number, number>>({});

  const mapListe = (value: string): Enfant['liste'] => {
    const v = String(value || '').toUpperCase();
    if (v === 'PRINCIPALE') return 'principale';
    if (v === 'ATTENTE_N1') return 'attente_n1';
    return 'attente_n2';
  };

  const mapStatut = (liste: Enfant['liste']): Enfant['statut'] => {
    if (liste === 'principale') return 'Titulaire';
    if (liste === 'attente_n1') return 'Suppléant N1';
    return 'Suppléant N2';
  };

  const mapLien = (value: string): Enfant['lienParente'] => {
    const v = String(value || '').toUpperCase();
    if (v === 'PERE') return 'Père';
    if (v === 'MERE') return 'Mère';
    if (v === 'TUTEUR_LEGAL') return 'Tuteur légal';
    return 'Autre';
  };

  const toApiLienParente = (value: Enfant['lienParente']) => {
    if (value === 'Père') return 'PERE';
    if (value === 'Mère') return 'MERE';
    if (value === 'Tuteur légal') return 'TUTEUR_LEGAL';
    return 'AUTRE';
  };

  const reloadParentDemandes = async () => {
    if (!token || role !== 'parent' || !authParent?.matricule) return;
    const demandes = await apiRequest<Array<{
      id: number;
      liste_code: string;
      rang_dans_liste: number;
      date_inscription: string;
      statut: string;
      non_validation_reason?: string | null;
      enfant_id: number;
      enfant_prenom: string;
      enfant_nom: string;
      enfant_date_naissance: string;
      enfant_sexe: string;
      enfant_lien_parente: string;
      enfant_is_titulaire: boolean;
    }>>('/parent/demandes', { token });

    const mapped: Enfant[] = demandes.map(d => {
      const liste = mapListe(d.liste_code);
      return {
        // We use demande_id as primary UI id to call parent action endpoints directly.
        id: String(d.id),
        parentMatricule: authParent.matricule,
        prenom: d.enfant_prenom,
        nom: d.enfant_nom,
        dateNaissance: d.enfant_date_naissance,
        sexe: String(d.enfant_sexe || '').toUpperCase() === 'F' ? 'F' : 'M',
        lienParente: mapLien(d.enfant_lien_parente),
        liste,
        statut: mapStatut(liste),
        dateInscription: d.date_inscription,
        validation: d.statut === 'NON_VALIDEE' ? 'refusé' : d.statut === 'RETENUE' ? 'validé' : 'en_attente',
        motifRefus: d.non_validation_reason || undefined,
        rangDansListe: typeof d.rang_dans_liste === 'number' ? d.rang_dans_liste : undefined,
      };
    });
    setEnfants(mapped);
    setParents([{
      matricule: authParent.matricule,
      prenom: authParent.prenom,
      nom: authParent.nom,
      service: authParent.service,
      motDePasse: '',
    }]);
  };

  const reloadAdminDemandes = async () => {
    if (!token || (role !== 'gestionnaire' && role !== 'super_admin')) return;
    const [l1, l2, l3, desistements] = await Promise.all([
      apiRequest<any[]>('/admin/listes/PRINCIPALE/demandes', { token }),
      apiRequest<any[]>('/admin/listes/ATTENTE_N1/demandes', { token }),
      apiRequest<any[]>('/admin/listes/ATTENTE_N2/demandes', { token }),
      apiRequest<any[]>('/admin/desistements/en-attente', { token }),
    ]);

    const merged = [...l1, ...l2, ...l3];
    const parentByMatricule = new Map<string, Parent>();
    merged.forEach((d) => {
      const mat = String(d.parent_matricule || '').trim();
      if (!mat) return;
      parentByMatricule.set(mat, {
        matricule: mat,
        prenom: String(d.parent_prenom || ''),
        nom: String(d.parent_nom || ''),
        service: String(d.parent_service || ''),
        motDePasse: '',
      });
    });
    if (role === 'super_admin') {
      try {
        const users = await apiRequest<
          Array<{
            role: string;
            matricule?: string | null;
            parent_prenom?: string | null;
            parent_nom?: string | null;
            parent_service?: string | null;
            email?: string | null;
          }>
        >('/admin/users', { token });
        users
          .filter((u) => String(u.role).toUpperCase() === 'PARENT')
          .forEach((u) => {
            const mat = String(u.matricule || '').trim();
            if (!mat) return;
            const cur = parentByMatricule.get(mat);
            parentByMatricule.set(mat, {
              matricule: mat,
              prenom: String(u.parent_prenom || cur?.prenom || ''),
              nom: String(u.parent_nom || cur?.nom || ''),
              service: String(u.parent_service || cur?.service || ''),
              motDePasse: '',
              email: u.email || cur?.email,
            });
          });
      } catch {
        /* garde la carte construite depuis les demandes */
      }
    }
    const desistementMap = desistements.reduce((acc: Record<number, number>, d) => {
      if (typeof d.demande_id === 'number' && typeof d.desistement_id === 'number') {
        acc[d.demande_id] = d.desistement_id;
      }
      return acc;
    }, {});
    const mapped: Enfant[] = merged.map((d) => {
      const liste = mapListe(d.liste);
      const statut = String(d.statut || '').toUpperCase();
      const rang =
        typeof d.rang === 'number'
          ? d.rang
          : typeof d.rang_dans_liste === 'number'
            ? d.rang_dans_liste
            : undefined;
      return {
        id: String(d.demande_id),
        parentMatricule: d.parent_matricule,
        prenom: d.enfant?.prenom || '',
        nom: d.enfant?.nom || '',
        dateNaissance: d.enfant?.date_naissance || '',
        sexe: String(d.enfant?.sexe || '').toUpperCase() === 'F' ? 'F' : 'M',
        lienParente: mapLien(d.enfant?.lien_parente || ''),
        liste,
        statut: mapStatut(liste),
        dateInscription: d.date_inscription,
        validation: statut === 'NON_VALIDEE' ? 'refusé' : statut === 'RETENUE' || statut === 'DESISTEE' ? 'validé' : 'en_attente',
        motifRefus: d.non_validation_reason || undefined,
        desistement: statut === 'DESISTEE' ? 'validé' : desistementMap[d.demande_id] ? 'demandé' : null,
        rangDansListe: rang,
      };
    });

    setEnfants(mapped);
    setParents(Array.from(parentByMatricule.values()));
    setDesistementByDemandeId(desistementMap);
  };

  useEffect(() => {
    const loadRuntimeSettings = async () => {
      if (!token) return;
      try {
        const runtime = await apiRequest<Partial<AppSettings>>('/admin/settings', { token });
        setSettings(prev => ({
          ...prev,
          ...runtime,
          accesParentsActif: runtime.accesParentsActif ?? true,
        }));
      } catch {
        // Keep local defaults if API read fails.
      }
    };
    loadRuntimeSettings();
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (role === 'parent') await reloadParentDemandes();
        if (role === 'gestionnaire' || role === 'super_admin') await reloadAdminDemandes();
      } catch {
        // Keep current UI state if an API call fails.
      }
    };
    loadData();
  }, [token, role, authParent?.matricule]);

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

  const addEnfant = async (enfant: Enfant) => {
    if (token && role === 'parent' && authParent) {
      await apiRequest('/parent/inscriptions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          parent: {
            matricule: authParent.matricule,
            prenom: authParent.prenom,
            nom: authParent.nom,
            service: authParent.service,
          },
          enfant: {
            prenom: enfant.prenom,
            nom: enfant.nom,
            date_naissance: enfant.dateNaissance,
            sexe: enfant.sexe,
            lien_parente: toApiLienParente(enfant.lienParente),
          },
        }),
      });
      await reloadParentDemandes();
      return;
    }
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
    const byRangThenDate = (a: Enfant, b: Enfant) => {
      const ra = typeof a.rangDansListe === 'number' ? a.rangDansListe : Number.MAX_SAFE_INTEGER;
      const rb = typeof b.rangDansListe === 'number' ? b.rangDansListe : Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime();
    };
    return enfants.filter(e => e.liste === liste).sort(byRangThenDate);
  };

  const setTitulaire = async (matricule: string, enfantId: string) => {
    if (token && role === 'parent') {
      await apiRequest('/parent/titulaire', {
        method: 'POST',
        token,
        body: JSON.stringify({ enfant_id_titulaire: Number(enfantId) }),
      });
      await reloadParentDemandes();
      return;
    }
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

  const demanderDesistement = async (enfantId: string) => {
    if (token && role === 'parent') {
      await apiRequest(`/parent/desistement/${Number(enfantId)}`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: null }),
      });
      await reloadParentDemandes();
      return;
    }
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: 'demandé' as const, dateDesistement: new Date().toISOString().split('T')[0] } : e));
  };

  const annulerDesistement = async (enfantId: string) => {
    if (token && role === 'parent') {
      await apiRequest(`/parent/desistement/${Number(enfantId)}/annuler`, { method: 'POST', token });
      await reloadParentDemandes();
      return;
    }
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: null, dateDesistement: undefined } : e));
  };

  const validerDesistement = async (enfantId: string) => {
    if (token && (role === 'gestionnaire' || role === 'super_admin')) {
      const demandeId = Number(enfantId);
      const desistementId = desistementByDemandeId[demandeId];
      if (!desistementId) {
        throw new Error('Désistement introuvable pour cette demande.');
      }
      await apiRequest(`/admin/desistements/${desistementId}/valider`, {
        method: 'POST',
        token,
        body: JSON.stringify({ validated: true }),
      });
      await reloadAdminDemandes();
      return;
    }
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, desistement: 'validé' as const } : e));
  };

  const reinscrireEnfant = async (enfantId: string) => {
    if (token && role === 'parent') {
      await apiRequest(`/parent/desistement/${Number(enfantId)}/reinscrire`, { method: 'POST', token });
      await reloadParentDemandes();
      return;
    }
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

  const validerEnfant = async (enfantId: string) => {
    if (token && (role === 'gestionnaire' || role === 'super_admin')) {
      await apiRequest(`/admin/demandes/${Number(enfantId)}/selection-finale`, {
        method: 'POST',
        token,
        body: JSON.stringify({ is_selection_finale: true }),
      });
      await reloadAdminDemandes();
      return;
    }
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, validation: 'validé' as const } : e));
  };

  const refuserEnfant = async (enfantId: string, motif: string) => {
    if (token && (role === 'gestionnaire' || role === 'super_admin')) {
      await apiRequest(`/admin/demandes/${Number(enfantId)}/selection-finale`, {
        method: 'POST',
        token,
        body: JSON.stringify({ is_selection_finale: false, non_validation_reason: motif }),
      });
      await reloadAdminDemandes();
      return;
    }
    setEnfants(prev => prev.map(e => e.id === enfantId ? { ...e, validation: 'refusé' as const, motifRefus: motif } : e));
  };

  const transfererEnfant = async (enfantId: string, nouvelleListe: Enfant['liste']) => {
    if (token && (role === 'gestionnaire' || role === 'super_admin')) {
      const toListeCode =
        nouvelleListe === 'principale' ? 'PRINCIPALE' : nouvelleListe === 'attente_n1' ? 'ATTENTE_N1' : 'ATTENTE_N2';
      await apiRequest(`/admin/demandes/${Number(enfantId)}/transferer`, {
        method: 'POST',
        token,
        body: JSON.stringify({ to_liste_code: toListeCode }),
      });
      await reloadAdminDemandes();
      return;
    }
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
    if (typeof enfant.rangDansListe === 'number') return enfant.rangDansListe;
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
