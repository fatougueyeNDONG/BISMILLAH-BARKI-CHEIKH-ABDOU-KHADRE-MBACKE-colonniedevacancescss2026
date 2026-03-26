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

export const MOCK_PARENTS: Parent[] = [
  { matricule: "CSS-2024-001", prenom: "Amadou", nom: "Diallo", service: "Direction Financière", motDePasse: "parent123", email: "amadou.diallo@css.sn", telephone: "77 123 45 67", premiereConnexion: false },
  { matricule: "CSS-2024-002", prenom: "Fatou", nom: "Sow", service: "Ressources Humaines", motDePasse: "parent123", email: "fatou.sow@css.sn", telephone: "77 234 56 78", premiereConnexion: true },
  { matricule: "CSS-2024-003", prenom: "Moussa", nom: "Ndiaye", service: "Direction Technique", motDePasse: "parent123", email: "moussa.ndiaye@css.sn", telephone: "77 345 67 89", premiereConnexion: true },
  { matricule: "CSS-2024-004", prenom: "Aïssatou", nom: "Ba", service: "Service Juridique", motDePasse: "parent123", email: "aissatou.ba@css.sn", telephone: "77 456 78 90", premiereConnexion: true },
  { matricule: "CSS-2024-005", prenom: "Ousmane", nom: "Diop", service: "Communication", motDePasse: "parent123", email: "ousmane.diop@css.sn", telephone: "77 567 89 01", premiereConnexion: true },
  { matricule: "CSS-2024-006", prenom: "Ibrahima", nom: "Fall", service: "Direction Générale", motDePasse: "parent123", email: "ibrahima.fall@css.sn", telephone: "77 678 90 12", premiereConnexion: true },
  { matricule: "CSS-2024-007", prenom: "Aminata", nom: "Diagne", service: "Comptabilité", motDePasse: "parent123", email: "aminata.diagne@css.sn", telephone: "77 789 01 23", premiereConnexion: true },
  { matricule: "CSS-2024-008", prenom: "Mamadou", nom: "Sarr", service: "Informatique", motDePasse: "parent123", email: "mamadou.sarr@css.sn", telephone: "77 890 12 34", premiereConnexion: true },
  { matricule: "CSS-2024-009", prenom: "Ndèye", nom: "Mboup", service: "Audit Interne", motDePasse: "parent123", email: "ndeye.mboup@css.sn", telephone: "77 901 23 45", premiereConnexion: true },
  { matricule: "CSS-2024-010", prenom: "Cheikh", nom: "Gueye", service: "Logistique", motDePasse: "parent123", email: "cheikh.gueye@css.sn", telephone: "77 012 34 56", premiereConnexion: true },
  { matricule: "CSS-2024-011", prenom: "Khady", nom: "Thiam", service: "Marketing", motDePasse: "parent123", email: "khady.thiam@css.sn", telephone: "76 123 45 67", premiereConnexion: true },
  { matricule: "CSS-2024-012", prenom: "Pape", nom: "Sy", service: "Direction Technique", motDePasse: "parent123", email: "pape.sy@css.sn", telephone: "76 234 56 78", premiereConnexion: true },
  { matricule: "CSS-2024-013", prenom: "Coumba", nom: "Kane", service: "Ressources Humaines", motDePasse: "parent123", email: "coumba.kane@css.sn", telephone: "76 345 67 89", premiereConnexion: true },
  { matricule: "CSS-2024-014", prenom: "Abdou", nom: "Faye", service: "Service Commercial", motDePasse: "parent123", email: "abdou.faye@css.sn", telephone: "76 456 78 90", premiereConnexion: true },
  { matricule: "CSS-2024-015", prenom: "Mariama", nom: "Cissé", service: "Direction Financière", motDePasse: "parent123", email: "mariama.cisse@css.sn", telephone: "76 567 89 01", premiereConnexion: true },
];

export const MOCK_ENFANTS: Enfant[] = [
  { id: "e1", parentMatricule: "CSS-2024-001", prenom: "Ibrahim", nom: "Diallo", dateNaissance: "2014-03-15", sexe: "M", lienParente: "Père", liste: "principale", statut: "Titulaire", dateInscription: "2026-01-15", validation: "en_attente" },
  { id: "e2", parentMatricule: "CSS-2024-001", prenom: "Mariama", nom: "Diallo", dateNaissance: "2016-07-22", sexe: "F", lienParente: "Père", liste: "attente_n1", statut: "Suppléant N1", dateInscription: "2026-01-15", validation: "en_attente" },
  { id: "e3", parentMatricule: "CSS-2024-002", prenom: "Abdoulaye", nom: "Sow", dateNaissance: "2015-11-08", sexe: "M", lienParente: "Mère", liste: "principale", statut: "Titulaire", dateInscription: "2026-01-20", validation: "en_attente" },
  { id: "e4", parentMatricule: "CSS-2024-003", prenom: "Khadija", nom: "Ndiaye", dateNaissance: "2013-05-30", sexe: "F", lienParente: "Père", liste: "principale", statut: "Titulaire", dateInscription: "2026-02-01", validation: "en_attente" },
  { id: "e5", parentMatricule: "CSS-2024-003", prenom: "Oumar", nom: "Ndiaye", dateNaissance: "2017-09-12", sexe: "M", lienParente: "Père", liste: "attente_n1", statut: "Suppléant N1", dateInscription: "2026-02-01", validation: "en_attente" },
  { id: "e6", parentMatricule: "CSS-2024-005", prenom: "Awa", nom: "Ndiaye", dateNaissance: "2018-01-25", sexe: "F", lienParente: "Autre", liste: "attente_n2", statut: "Suppléant N2", dateInscription: "2026-02-01", validation: "en_attente" },
  { id: "e7", parentMatricule: "CSS-2024-005", prenom: "Babacar Amala", nom: "MBENGUE", dateNaissance: "2017-06-10", sexe: "M", lienParente: "Père", liste: "principale", statut: "Titulaire", dateInscription: "2026-02-05", validation: "en_attente" },
  { id: "e8", parentMatricule: "CSS-2024-005", prenom: "Maman Kiné", nom: "MBENGUE", dateNaissance: "2015-08-20", sexe: "F", lienParente: "Père", liste: "attente_n1", statut: "Suppléant N1", dateInscription: "2026-02-05", validation: "en_attente" },
];

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: "a1", email: "admin@css.sn", nom: "Faye", prenom: "Cheikh", role: "gestionnaire", actif: true, dateCreation: "2025-06-01", motDePasse: "admin123", telephone: "77 111 22 33" },
  { id: "a2", email: "superadmin@css.sn", nom: "Mbaye", prenom: "Souleymane", role: "super_admin", actif: true, dateCreation: "2025-01-01", motDePasse: "admin123", telephone: "77 222 33 44" },
];

export const MOCK_HISTORIQUE: HistoriqueEntry[] = [
  { id: "h1", date: "2026-01-15", heure: "09:30", utilisateur: "Amadou Diallo", role: "Parent", action: "Inscription", details: "A inscrit Ibrahim Diallo en Liste Principale", cible: "Ibrahim Diallo" },
  { id: "h2", date: "2026-01-15", heure: "09:35", utilisateur: "Amadou Diallo", role: "Parent", action: "Inscription", details: "A inscrit Mariama Diallo en Liste N°1", cible: "Mariama Diallo" },
  { id: "h3", date: "2026-01-20", heure: "14:15", utilisateur: "Fatou Sow", role: "Parent", action: "Inscription", details: "A inscrit Abdoulaye Sow en Liste Principale", cible: "Abdoulaye Sow" },
];

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

export const MOCK_LISTES: Liste[] = [
  { id: 'l1', nom: 'Liste Principale', code: 'principale', description: 'Liste des enfants titulaires', ordre: 1, active: true },
  { id: 'l2', nom: "Liste d'attente N°1", code: 'attente_n1', description: 'Première liste de suppléants (lien direct)', ordre: 2, active: true },
  { id: 'l3', nom: "Liste d'attente N°2", code: 'attente_n2', description: 'Deuxième liste de suppléants (autres liens)', ordre: 3, active: true },
];

export const MOCK_SITES: Site[] = [
  { id: 's1', nom: 'VDN', code: 'VDN', adresse: '', ville: 'Dakar', capacite: 60, actif: true },
  { id: 's2', nom: 'ZIGUINCHOR', code: 'ZIG', adresse: '', ville: 'Ziguinchor', capacite: 40, actif: true },
  { id: 's3', nom: 'MBOUR', code: 'MBR', adresse: '', ville: 'Mbour', capacite: 50, actif: true },
];

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
