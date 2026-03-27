import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useInscription } from '@/contexts/InscriptionContext';
import { Users, UserCheck, Clock, Star, Award, AlertTriangle, Lock } from 'lucide-react';

function calculateAge(dateNaissance: string): number {
  const birth = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ParentDashboard() {
  const { parent } = useAuth();
  const { getEnfantsByParent, getListeFinale, settings } = useInscription();
  if (!parent) return null;

  const now = new Date();
  const dateFin = settings.dateFinInscriptions ? new Date(settings.dateFinInscriptions + 'T23:59:59') : null;
  const inscriptionsCloturees = dateFin ? now > dateFin : false;

  const MAX = settings.maxEnfantsParParent;
  const maxForUi = MAX ?? 0;
  const enfants = getEnfantsByParent(parent.matricule);
  const allDesistes = inscriptionsCloturees && enfants.length > 0 && enfants.every(e => e.desistement === 'validé');
  const titulaire = enfants.find(e => e.statut === 'Titulaire');
  const suppN1 = enfants.find(e => e.statut === 'Suppléant N1');
  const suppN2 = enfants.find(e => e.statut === 'Suppléant N2');
  const listeFinale = getListeFinale();

  const enfantsRetenus = enfants.filter(e => listeFinale.some(f => f.id === e.id));

  const allSlots = [
    { label: 'Titulaire — Liste Principale', enfant: titulaire, color: 'bg-emerald-500', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', icon: Star },
    { label: 'Suppléant — Liste N1', enfant: suppN1, color: 'bg-accent', bgColor: 'bg-accent/10', textColor: 'text-accent', icon: Clock },
    { label: 'Suppléant — Liste N2', enfant: suppN2, color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700', icon: Clock },
  ];

  // Show slots that have an enfant + one empty slot if parent still has room
  const filledSlots = allSlots.filter(s => s.enfant);
  const emptySlots = allSlots.filter(s => !s.enfant);
  const slotsToShow = (MAX !== null && enfants.length < MAX)
    ? [...filledSlots, ...(emptySlots.length > 0 ? [emptySlots[0]] : [])]
    : filledSlots;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Bienvenue, {parent.prenom} {parent.nom}</h1>
        <p className="text-muted-foreground mt-1">
          Matricule : <span className="font-mono tabular-nums text-foreground">{parent.matricule}</span> — {parent.service}
        </p>
      </motion.div>

      {/* Bandeau inscriptions clôturées */}
      {inscriptionsCloturees && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            {allDesistes ? <Lock className="w-6 h-6 text-amber-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
          </div>
          <div>
            <h3 className="font-semibold text-amber-800">
              {allDesistes ? '🔒 Accès restreint — Aucune action disponible' : '⚠️ Période d\'inscription terminée'}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {allDesistes
                ? 'Tous vos enfants ont été désistés et validés par le gestionnaire. Vous ne disposez plus d\'aucune action. Pour toute question, contactez l\'administration.'
                : `Les inscriptions sont clôturées depuis le ${new Date(settings.dateFinInscriptions).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Vous ne pouvez plus inscrire de nouveaux enfants ni modifier vos inscriptions. Seule l'action de désistement reste disponible depuis la section "Mes enfants".`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Notification si enfant retenu */}
      {enfantsRetenus.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-800">🎉 Bonne nouvelle !</h3>
            <p className="text-sm text-emerald-700 mt-1">
              {enfantsRetenus.length === 1
                ? `Votre enfant ${enfantsRetenus[0].prenom} ${enfantsRetenus[0].nom} a été retenu(e) pour la Colonie de Vacances 2026 !`
                : `Vos enfants ${enfantsRetenus.map(e => `${e.prenom} ${e.nom}`).join(' et ')} ont été retenus pour la Colonie de Vacances 2026 !`}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Enfants inscrits', value: enfants.length, max: maxForUi, icon: Users, color: 'text-primary' },
          { label: 'Places restantes', value: Math.max(maxForUi - enfants.length, 0), max: maxForUi, icon: UserCheck, color: 'text-emerald-600' },
          { label: 'En liste principale', value: titulaire ? 1 : 0, max: 1, icon: Star, color: 'text-accent' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} className="bg-card rounded-xl shadow-card p-5 border border-border">
            <div className="flex items-center justify-between">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-2xl font-bold text-foreground">{stat.value}<span className="text-sm font-normal text-muted-foreground">/{stat.max}</span></span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Vos inscriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slotsToShow.map((slot, i) => (
            <motion.div key={slot.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + 0.1 * i }} className={`rounded-xl border border-border p-5 ${slot.enfant ? 'bg-card' : 'bg-muted/30 border-dashed'} shadow-card`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${slot.enfant ? slot.color : 'bg-muted-foreground/30'}`} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{slot.label}</span>
              </div>
              {slot.enfant ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{slot.enfant.prenom} {slot.enfant.nom}</p>
                  <p className="text-sm text-muted-foreground">{calculateAge(slot.enfant.dateNaissance)} ans — {slot.enfant.sexe === 'M' ? 'Garçon' : 'Fille'}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-medium ${slot.bgColor} ${slot.textColor}`}>{slot.enfant.statut}</span>
                  {slot.enfant.desistement === 'demandé' && (
                    <span className="inline-block ml-2 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">⏳ Désistement en attente</span>
                  )}
                  {slot.enfant.desistement === 'validé' && (
                    <span className="inline-block ml-2 px-2 py-0.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive">Désisté</span>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Place disponible</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
