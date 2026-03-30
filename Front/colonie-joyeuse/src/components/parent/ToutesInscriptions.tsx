import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Enfant, Parent } from '@/data/mockData';

function calculateAge(dateNaissance: string): number {
  const birth = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

type ApiTransparenceRow = {
  demande_id: number;
  liste_code: string;
  rang_dans_liste: number;
  date_inscription: string;
  statut_demande: string;
  parent_matricule: string;
  parent_prenom: string;
  parent_nom: string;
  parent_service: string;
  enfant_prenom: string;
  enfant_nom: string;
  enfant_date_naissance: string;
  enfant_sexe: string;
};

function mapListe(value: string): Enfant['liste'] {
  const v = String(value || '').toUpperCase();
  if (v === 'PRINCIPALE') return 'principale';
  if (v === 'ATTENTE_N1') return 'attente_n1';
  return 'attente_n2';
}

function mapStatutListe(liste: Enfant['liste']): Enfant['statut'] {
  if (liste === 'principale') return 'Titulaire';
  if (liste === 'attente_n1') return 'Suppléant N1';
  return 'Suppléant N2';
}

function mapRowsToState(rows: ApiTransparenceRow[]): { enfants: Enfant[]; parents: Parent[] } {
  const parentMap = new Map<string, Parent>();
  const enfants: Enfant[] = [];
  for (const r of rows) {
    if (!parentMap.has(r.parent_matricule)) {
      parentMap.set(r.parent_matricule, {
        matricule: r.parent_matricule,
        prenom: r.parent_prenom,
        nom: r.parent_nom,
        service: r.parent_service,
        motDePasse: '',
      });
    }
    const liste = mapListe(r.liste_code);
    const statutListe = mapStatutListe(liste);
    const sd = String(r.statut_demande || '').toUpperCase();
    const validation =
      sd === 'NON_VALIDEE' ? 'refusé' : sd === 'RETENUE' || sd === 'DESISTEE' ? 'validé' : 'en_attente';
    const dob = r.enfant_date_naissance.includes('T')
      ? r.enfant_date_naissance.slice(0, 10)
      : r.enfant_date_naissance;
    enfants.push({
      id: String(r.demande_id),
      parentMatricule: r.parent_matricule,
      prenom: r.enfant_prenom,
      nom: r.enfant_nom,
      dateNaissance: dob,
      sexe: String(r.enfant_sexe || '').toUpperCase() === 'F' ? 'F' : 'M',
      lienParente: 'Autre',
      liste,
      statut: statutListe,
      dateInscription: r.date_inscription,
      validation,
      statutDemande: sd,
      rangDansListe: r.rang_dans_liste,
    });
  }
  return { enfants, parents: Array.from(parentMap.values()) };
}

function libelleStatutAffiche(e: Enfant): string {
  const sd = e.statutDemande;
  if (sd === 'DESISTEE') return 'Désisté';
  if (sd === 'NON_VALIDEE') return 'Non retenue';
  if (sd === 'SOUMISE') return 'En attente (sélection)';
  return e.statut;
}

function classeBadgeStatut(e: Enfant): string {
  const sd = e.statutDemande;
  if (sd === 'DESISTEE') return 'bg-muted text-muted-foreground';
  if (sd === 'NON_VALIDEE') return 'bg-destructive/10 text-destructive';
  if (sd === 'SOUMISE') return 'bg-amber-50 text-amber-800';
  switch (e.statut) {
    case 'Titulaire':
      return 'bg-emerald-50 text-emerald-700';
    case 'Suppléant N1':
      return 'bg-accent/10 text-accent';
    case 'Suppléant N2':
      return 'bg-primary/10 text-primary';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function ToutesInscriptions() {
  const { token, role } = useAuth();
  const [enfants, setEnfants] = useState<Enfant[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    if (!token || role !== 'parent') {
      setLoading(false);
      setEnfants([]);
      setParents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await apiRequest<ApiTransparenceRow[]>('/parent/inscriptions-transparence', { token });
      const mapped = mapRowsToState(rows);
      setEnfants(mapped.enfants);
      setParents(mapped.parents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les inscriptions.');
      setEnfants([]);
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedEnfants = [...enfants].sort(
    (a, b) => new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime()
  );

  const getListeLabel = (liste: string) => {
    switch (liste) {
      case 'principale':
        return 'Liste Principale';
      case 'attente_n1':
        return 'Liste N°1';
      case 'attente_n2':
        return 'Liste N°2';
      default:
        return liste;
    }
  };

  const filtered = sortedEnfants.filter(e => {
    if (!searchTerm) return true;
    const p = parents.find(x => x.matricule === e.parentMatricule);
    const s = searchTerm.toLowerCase();
    return (
      e.parentMatricule.toLowerCase().includes(s) ||
      e.nom.toLowerCase().includes(s) ||
      e.prenom.toLowerCase().includes(s) ||
      (p?.nom || '').toLowerCase().includes(s) ||
      (p?.prenom || '').toLowerCase().includes(s)
    );
  });

  const getRang = (enfant: Enfant) => {
    if (typeof enfant.rangDansListe === 'number') return enfant.rangDansListe;
    const listeEnfants = sortedEnfants.filter(e => e.liste === enfant.liste);
    return listeEnfants.findIndex(e => e.id === enfant.id) + 1;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Toutes les inscriptions</h1>
            <p className="text-muted-foreground mt-1">
              Consultez l'ensemble des inscriptions — {loading ? '…' : `${enfants.length} inscription(s) au total`}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-accent">ℹ️ Information :</strong> Cette liste est en consultation uniquement. Elle
          permet à chaque parent de vérifier la transparence du processus d'inscription (toutes les familles inscrites).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par matricule, nom..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9 rounded-lg"
          disabled={loading}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl shadow-card border border-border"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement des inscriptions…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Rang</TableHead>
                  <TableHead className="font-semibold">Matricule</TableHead>
                  <TableHead className="font-semibold">Nom du parent</TableHead>
                  <TableHead className="font-semibold">Prénom du parent</TableHead>
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Prénom Enfant</TableHead>
                  <TableHead className="font-semibold">Nom Enfant</TableHead>
                  <TableHead className="font-semibold">Âge</TableHead>
                  <TableHead className="font-semibold">Sexe</TableHead>
                  <TableHead className="font-semibold">Liste</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Inscrit le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Aucune inscription
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(e => {
                    const p = parents.find(x => x.matricule === e.parentMatricule);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-bold text-foreground">{getRang(e)}</TableCell>
                        <TableCell className="font-mono tabular-nums text-sm">{e.parentMatricule}</TableCell>
                        <TableCell>{p?.nom || '—'}</TableCell>
                        <TableCell>{p?.prenom || '—'}</TableCell>
                        <TableCell className="text-sm">{p?.service || '—'}</TableCell>
                        <TableCell>{e.prenom}</TableCell>
                        <TableCell className="font-medium">{e.nom}</TableCell>
                        <TableCell>{calculateAge(e.dateNaissance)} ans</TableCell>
                        <TableCell>{e.sexe === 'M' ? 'M' : 'F'}</TableCell>
                        <TableCell>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {getListeLabel(e.liste)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-md ${classeBadgeStatut(e)}`}
                          >
                            {libelleStatutAffiche(e)}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm text-muted-foreground">
                          {new Date(e.dateInscription).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
