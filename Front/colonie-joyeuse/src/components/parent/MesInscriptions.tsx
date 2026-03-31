import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useInscription } from '@/contexts/InscriptionContext';
import { apiRequest } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

type TransparenceRow = {
  demande_id: number;
  liste_code: string;
  date_inscription: string;
};

function calculateAge(dateNaissance: string): number {
  const birth = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function MesInscriptions() {
  const { parent, token, role } = useAuth();
  const { getEnfantsByParent } = useInscription();
  const [rangCommeGestionnaire, setRangCommeGestionnaire] = useState<Map<string, number>>(new Map());

  const enfants = parent ? getEnfantsByParent(parent.matricule) : [];
  const transparenceDeps = useMemo(
    () => enfants.map((e) => `${e.id}:${e.dateInscription}:${e.liste}`).join('|'),
    [enfants],
  );

  /** Même règle que GestionListe : tri par date d'inscription sur chaque liste, puis Rang = index 1…n. */
  useEffect(() => {
    if (!token || role !== 'parent') {
      setRangCommeGestionnaire(new Map());
      return;
    }
    let cancelled = false;
    apiRequest<TransparenceRow[]>('/parent/inscriptions-transparence', { token })
      .then((rows) => {
        if (cancelled) return;
        const byListe = new Map<string, TransparenceRow[]>();
        for (const r of rows) {
          const code = String(r.liste_code || '').toUpperCase();
          if (!byListe.has(code)) byListe.set(code, []);
          byListe.get(code)!.push(r);
        }
        const m = new Map<string, number>();
        byListe.forEach((list) => {
          const sorted = [...list].sort(
            (a, b) => new Date(a.date_inscription).getTime() - new Date(b.date_inscription).getTime(),
          );
          sorted.forEach((r, i) => {
            m.set(String(r.demande_id), i + 1);
          });
        });
        setRangCommeGestionnaire(m);
      })
      .catch(() => {
        if (!cancelled) setRangCommeGestionnaire(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [token, role, transparenceDeps]);

  if (!parent) return null;

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'Titulaire': return 'bg-emerald-50 text-emerald-700';
      case 'Suppléant N1': return 'bg-accent/10 text-accent';
      case 'Suppléant N2': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getListeLabel = (liste: string) => {
    switch (liste) {
      case 'principale': return 'Liste Principale';
      case 'attente_n1': return "Liste d'Attente N°1";
      case 'attente_n2': return "Liste d'Attente N°2";
      default: return liste;
    }
  };

  const getValidationMessage = (enfant: typeof enfants[0]) => {
    const validation = enfant.validation || 'en_attente';
    if (enfant.desistement === 'demandé') {
      return { icon: <Clock className="w-4 h-4 text-amber-600" />, text: 'Votre demande de désistement est en cours de traitement par le gestionnaire.', color: 'bg-amber-50 border-amber-200 text-amber-800' };
    }
    if (enfant.desistement === 'validé') {
      return { icon: <CheckCircle2 className="w-4 h-4 text-destructive" />, text: 'Le gestionnaire a validé votre désistement. Si toutefois vous changez d\'avis, vous avez la possibilité de réinscrire votre enfant depuis la section « Mes enfants ».', color: 'bg-destructive/5 border-destructive/20 text-destructive' };
    }
    if (validation === 'validé') {
      return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, text: '✅ Le gestionnaire a approuvé cette demande. Votre enfant fait partie de la liste finale des retenus pour la colonie !', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    }
    if (validation === 'refusé') {
      return { icon: <XCircle className="w-4 h-4 text-destructive" />, text: `❌ Le gestionnaire a refusé cette demande. Motif : ${enfant.motifRefus || 'Non précisé'}.`, color: 'bg-destructive/5 border-destructive/20 text-destructive' };
    }
    return { icon: <Clock className="w-4 h-4 text-muted-foreground" />, text: 'En attente de validation par le gestionnaire. Votre demande sera examinée prochainement.', color: 'bg-muted/50 border-border text-muted-foreground' };
  };

  const getRangAffiche = (e: (typeof enfants)[0]) => {
    const v = rangCommeGestionnaire.get(e.id);
    if (typeof v === 'number') return v;
    return '—';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Mes inscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Historique de vos inscriptions pour la Colonie 2026. La colonne « Rang » reprend la même position que
          sur la liste correspondante côté gestionnaire (tri par date d&apos;inscription sur toute la liste).
        </p>
      </motion.div>

      {/* Status notifications for each child */}
      {enfants.length > 0 && (
        <div className="space-y-3">
          {enfants.map(enfant => {
            const msg = getValidationMessage(enfant);
            return (
              <motion.div key={enfant.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`flex items-start gap-3 p-3 rounded-lg border ${msg.color}`}>
                {msg.icon}
                <div className="flex-1">
                  <p className="text-sm font-medium">{enfant.prenom} {enfant.nom}</p>
                  <p className="text-xs mt-0.5">{msg.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl shadow-card border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Rang</TableHead>
                <TableHead className="font-semibold">Enfant</TableHead>
                <TableHead className="font-semibold">Date de naissance</TableHead>
                <TableHead className="font-semibold">Âge</TableHead>
                <TableHead className="font-semibold">Sexe</TableHead>
                <TableHead className="font-semibold">Lien</TableHead>
                <TableHead className="font-semibold">Liste</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Décision</TableHead>
                <TableHead className="font-semibold">Désistement</TableHead>
                <TableHead className="font-semibold">Date désist.</TableHead>
                <TableHead className="font-semibold">Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enfants.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Aucune inscription</TableCell></TableRow>
              ) : (
                enfants.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-bold text-foreground">{getRangAffiche(e)}</TableCell>
                    <TableCell className="font-medium text-foreground">{e.prenom} {e.nom}</TableCell>
                    <TableCell className="tabular-nums">{new Date(e.dateNaissance).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{calculateAge(e.dateNaissance)} ans</TableCell>
                    <TableCell>{e.sexe === 'M' ? 'Masculin' : 'Féminin'}</TableCell>
                    <TableCell>{e.lienParente}</TableCell>
                    <TableCell className="text-sm">{getListeLabel(e.liste)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatutBadge(e.statut)}`}>{e.statut}</span>
                    </TableCell>
                    <TableCell>
                      {(e.validation || 'en_attente') === 'validé' && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">✅ Approuvé</span>}
                      {(e.validation || 'en_attente') === 'refusé' && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">❌ Refusé</span>}
                      {(e.validation || 'en_attente') === 'en_attente' && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">⏳ En attente</span>}
                    </TableCell>
                    <TableCell>
                      {e.desistement === 'demandé' && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">⏳ En attente</span>}
                      {e.desistement === 'validé' && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">Validé</span>}
                      {!e.desistement && <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {e.dateDesistement ? new Date(e.dateDesistement).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">{new Date(e.dateInscription).toLocaleDateString('fr-FR')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
