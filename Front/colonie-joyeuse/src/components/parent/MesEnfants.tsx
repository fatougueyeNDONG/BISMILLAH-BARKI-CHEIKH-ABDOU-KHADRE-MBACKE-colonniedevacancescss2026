import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useInscription } from '@/contexts/InscriptionContext';
import { Star, ArrowUpDown, User, HandMetal, AlertTriangle, CheckCircle2, Award, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

function calculateAge(dateNaissance: string): number {
  const birth = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function MesEnfants() {
  const { parent } = useAuth();
  const { getEnfantsByParent, setTitulaire, demanderDesistement, annulerDesistement, reinscrireEnfant, getListeFinale, settings } = useInscription();

  const now = new Date();
  const dateFin = settings.dateFinInscriptions ? new Date(settings.dateFinInscriptions + 'T23:59:59') : null;
  const inscriptionsCloturees = dateFin ? now > dateFin : false;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [desistementOpen, setDesistementOpen] = useState(false);
  const [desistementId, setDesistementId] = useState('');
  const [desistementName, setDesistementName] = useState('');
  const [reinscrireOpen, setReinscrireOpen] = useState(false);
  const [reinscrireId, setReinscrireId] = useState('');
  const [reinscireName, setReinscireName] = useState('');
  const [cancelDesistError, setCancelDesistError] = useState(false);
  const [actionErrorOpen, setActionErrorOpen] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState('');

  if (!parent) return null;
  const enfants = getEnfantsByParent(parent.matricule);
  const listeFinale = getListeFinale();

  const handleSetTitulaire = (id: string, name: string) => { setSelectedId(id); setSelectedName(name); setConfirmOpen(true); };
  const confirmChange = async () => {
    try {
      await setTitulaire(parent.matricule, selectedId);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Action impossible');
      setActionErrorOpen(true);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
  };

  const handleDesistement = (id: string, name: string) => { setDesistementId(id); setDesistementName(name); setDesistementOpen(true); };
  const confirmDesistement = async () => {
    try {
      await demanderDesistement(desistementId);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Action impossible');
      setActionErrorOpen(true);
      setDesistementOpen(false);
      return;
    }
    setDesistementOpen(false);
  };

  const handleAnnulerDesistement = async (id: string) => {
    const enfant = enfants.find(e => e.id === id);
    if (enfant?.desistement === 'validé') {
      setCancelDesistError(true);
      return;
    }
    try {
      await annulerDesistement(id);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Action impossible');
      setActionErrorOpen(true);
      return;
    }
  };

  const handleReinscrire = (id: string, name: string) => { setReinscrireId(id); setReinscireName(name); setReinscrireOpen(true); };
  const confirmReinscrire = async () => {
    try {
      await reinscrireEnfant(reinscrireId);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Action impossible');
      setActionErrorOpen(true);
      setReinscrireOpen(false);
      return;
    }
    setReinscrireOpen(false);
  };

  const getStatutStyle = (statut: string) => {
    switch (statut) {
      case 'Titulaire': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Suppléant N1': return 'bg-accent/10 text-accent border-accent/20';
      case 'Suppléant N2': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isInFinale = (id: string) => listeFinale.some(e => e.id === id);

  if (enfants.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border p-12 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto"><User className="w-10 h-10 text-accent" /></div>
          <h2 className="text-xl font-bold text-foreground">Aucun enfant inscrit</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">Rendez-vous dans "Inscrire un enfant" pour commencer.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Mes enfants</h1>
        <p className="text-muted-foreground mt-1">{enfants.length} enfant(s) inscrit(s)</p>
      </motion.div>

      {inscriptionsCloturees && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Période d'inscription terminée</p>
            <p className="text-xs text-amber-700 mt-1">
              {enfants.every(e => e.desistement === 'validé')
                ? "Tous vos enfants ont été désistés. Aucune action n'est disponible."
                : "Seule l'action de désistement est disponible. Les modifications et réinscriptions ne sont plus possibles."}
            </p>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {enfants.map((enfant, i) => {
          const inFinale = isInFinale(enfant.id);
          return (
            <motion.div key={enfant.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="bg-card rounded-xl shadow-card border border-border p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enfant.statut === 'Titulaire' ? 'bg-emerald-100' : 'bg-muted'}`}>
                    {enfant.statut === 'Titulaire' ? <Star className="w-5 h-5 text-emerald-600" /> : <User className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{enfant.prenom} {enfant.nom}</p>
                      {enfant.reinscrit && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">Réinscrit</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{calculateAge(enfant.dateNaissance)} ans — {enfant.sexe === 'M' ? 'Garçon' : 'Fille'} — {enfant.lienParente}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Né(e) le {new Date(enfant.dateNaissance).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-lg border ${getStatutStyle(enfant.statut)}`}>{enfant.statut}</span>

                  {inFinale && !enfant.desistement && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Retenu(e) pour la colonie
                    </span>
                  )}

                  {enfant.validation === 'en_attente' && !enfant.desistement && (
                    <span className="text-xs font-medium px-3 py-1 rounded-lg bg-muted text-muted-foreground">⏳ En attente de validation</span>
                  )}

                  {enfant.validation === 'refusé' && (
                    <span className="text-xs font-medium px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Refusé — {enfant.motifRefus}
                    </span>
                  )}

                  {enfant.desistement === 'demandé' && (
                    <span className="text-xs font-medium px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">⏳ Désistement en attente</span>
                  )}

                  {enfant.desistement === 'validé' && (
                    <span className="text-xs font-medium px-3 py-1 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">✓ Désistement validé</span>
                  )}

                  <div className="flex gap-2 mt-1 flex-wrap">
                    {/* After deadline: only désistement allowed, no titulaire change, no réinscription */}
                    {!inscriptionsCloturees && enfant.statut !== 'Titulaire' && enfant.lienParente !== 'Autre' && !enfant.desistement && (
                      <Button variant="outline" size="sm" onClick={() => handleSetTitulaire(enfant.id, `${enfant.prenom} ${enfant.nom}`)} className="rounded-lg gap-1 text-xs">
                        <ArrowUpDown className="w-3 h-3" />Définir titulaire
                      </Button>
                    )}

                    {!enfant.desistement && enfant.validation !== 'refusé' && (
                      <Button variant="outline" size="sm" onClick={() => handleDesistement(enfant.id, `${enfant.prenom} ${enfant.nom}`)} className="rounded-lg gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        <HandMetal className="w-3 h-3" />Désistement
                      </Button>
                    )}

                    {enfant.desistement === 'demandé' && (
                      <Button variant="outline" size="sm" onClick={() => handleAnnulerDesistement(enfant.id)} className="rounded-lg gap-1 text-xs text-amber-700 border-amber-300 hover:bg-amber-50">
                        <XCircle className="w-3 h-3" />Annuler désistement
                      </Button>
                    )}

                    {/* Réinscrire only available before deadline */}
                    {!inscriptionsCloturees && enfant.desistement === 'validé' && (
                      <Button variant="outline" size="sm" onClick={() => handleReinscrire(enfant.id, `${enfant.prenom} ${enfant.nom}`)} className="rounded-lg gap-1 text-xs hover:bg-accent hover:text-white hover:border-accent">
                        <RotateCcw className="w-3 h-3" />Réinscrire
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Confirm Titulaire */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Changer l'enfant titulaire</DialogTitle>
            <DialogDescription className="pt-2">Êtes-vous sûr de vouloir définir <strong>{selectedName}</strong> comme enfant titulaire ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={confirmChange} className="rounded-lg bg-accent text-white hover:bg-accent/90">Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionErrorOpen} onOpenChange={setActionErrorOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Action impossible</DialogTitle>
            <DialogDescription className="pt-2">{actionErrorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setActionErrorOpen(false)} className="rounded-lg">Compris</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Désistement */}
      <Dialog open={desistementOpen} onOpenChange={setDesistementOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
              <DialogTitle className="text-foreground">Confirmer le désistement</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Vous êtes sur le point de demander le désistement de <strong>{desistementName}</strong>.
              <br /><br />Cela signifie que vous ne souhaitez plus que cet enfant participe à la Colonie de Vacances 2026. Cette demande sera envoyée à l'administration pour validation.
              <br /><br />Vous pourrez annuler cette demande tant que le gestionnaire ne l'a pas encore validée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesistementOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={confirmDesistement} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmer le désistement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel desist error */}
      <Dialog open={cancelDesistError} onOpenChange={setCancelDesistError}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <DialogTitle className="text-foreground">Annulation impossible</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Le gestionnaire a déjà validé le désistement de cet enfant. L'annulation n'est plus possible à ce stade.
              <br /><br />Si vous souhaitez remettre votre enfant dans le processus d'inscription, veuillez utiliser le bouton <strong>« Réinscrire »</strong> disponible sur la fiche de cet enfant. L'enfant sera réintégré dans sa liste d'origine en respectant l'ordre d'arrivée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setCancelDesistError(false)} className="bg-primary text-primary-foreground rounded-lg">Compris</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Réinscrire */}
      <Dialog open={reinscrireOpen} onOpenChange={setReinscrireOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><RotateCcw className="w-5 h-5 text-accent" /></div>
              <DialogTitle className="text-foreground">Réinscrire l'enfant</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Vous souhaitez réinscrire <strong>{reinscireName}</strong> après son désistement.
              <br /><br /><strong>Important :</strong> L'enfant sera réintégré dans sa liste d'origine mais ne retrouvera pas son ancien rang. Il sera placé en fin de liste en respectant l'ordre d'arrivée (nouvelle date d'inscription).
              <br /><br />La demande devra à nouveau être validée par le gestionnaire.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReinscrireOpen(false)} className="rounded-lg">Annuler</Button>
            <Button variant="outline" onClick={confirmReinscrire} className="rounded-lg hover:bg-accent hover:text-white hover:border-accent">Confirmer la réinscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
