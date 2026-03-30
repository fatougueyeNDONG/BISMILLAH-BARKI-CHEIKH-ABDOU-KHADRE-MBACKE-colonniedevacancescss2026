export interface Parent {
  matricule: string;
  prenom: string;
  nom: string;
  service: string;
  site?: string;
  motDePasse: string;
  email?: string;
  telephone?: string;
  premiereConnexion?: boolean;
  mailEnvoye?: boolean;
}

export interface Enfant {
  id: string;
  parentMatricule: string;
  prenom: string;
  nom: string;
  dateNaissance: string;
  sexe: 'M' | 'F';
  lienParente: 'Père' | 'Mère' | 'Tuteur légal' | 'Autre';
  liste: 'principale' | 'attente_n1' | 'attente_n2';
  statut: 'Titulaire' | 'Suppléant N1' | 'Suppléant N2';
  dateInscription: string;
  desistement?: 'demandé' | 'validé' | null;
  dateDesistement?: string;
  validation?: 'en_attente' | 'validé' | 'refusé';
  motifRefus?: string;
  reinscrit?: boolean;
  /** Rang affiché (API transparence). */
  rangDansListe?: number;
}

export interface Inscription {
  id: string;
  parent: Parent;
  enfant: Enfant;
  dateInscription: string;
}

export interface AdminUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'gestionnaire' | 'super_admin';
  actif: boolean;
  dateCreation: string;
  motDePasse: string;
  telephone?: string;
}

export interface HistoriqueEntry {
  id: string;
  date: string;
  heure: string;
  utilisateur: string;
  role: string;
  action: string;
  details: string;
  cible?: string;
}

export const MOCK_PARENTS: Parent[] = [];

export const MOCK_ENFANTS: Enfant[] = [];

export const MOCK_ADMIN_USERS: AdminUser[] = [];

export const MOCK_HISTORIQUE: HistoriqueEntry[] = [];

export function getParentByMatricule(matricule: string): Parent | undefined {
  return MOCK_PARENTS.find(p => p.matricule.toLowerCase() === matricule.toLowerCase());
}

export function getEnfantsByParent(matricule: string): Enfant[] {
  return MOCK_ENFANTS.filter(e => e.parentMatricule === matricule);
}

export function calculateAge(dateNaissance: string): number {
  const birth = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getListeStats() {
  const principale = MOCK_ENFANTS.filter(e => e.liste === 'principale').length;
  const n1 = MOCK_ENFANTS.filter(e => e.liste === 'attente_n1').length;
  const n2 = MOCK_ENFANTS.filter(e => e.liste === 'attente_n2').length;
  return { principale, n1, n2, total: principale + n1 + n2 };
}

export interface Liste {
  id: string;
  nom: string;
  code: string;
  description: string;
  ordre: number;
  active: boolean;
}

export interface Site {
  id: string;
  nom: string;
  code: string;
  adresse: string;
  ville: string;
  capacite: number;
  actif: boolean;
}

export const MOCK_LISTES: Liste[] = [];

export const MOCK_SITES: Site[] = [];

export interface AppSettings {
  colonieNom: string;
  dateDebutInscriptions: string;
  dateFinInscriptions: string;
  dateDebutColonie: string;
  dateFinColonie: string;
  capaciteMax: number | null;
  maxEnfantsParParent: number | null;
  ageMin: number;
  ageMax: number;
  inscriptionsOuvertes: boolean;
  accesParentsActif: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  colonieNom: 'Colonie de Vacances 2026',
  dateDebutInscriptions: '2026-01-01',
  dateFinInscriptions: '2026-04-30',
  dateDebutColonie: '2026-07-01',
  dateFinColonie: '2026-08-31',
  capaciteMax: 100,
  maxEnfantsParParent: 2,
  ageMin: 2012,
  ageMax: 2019,
  inscriptionsOuvertes: true,
  accesParentsActif: true,
};
