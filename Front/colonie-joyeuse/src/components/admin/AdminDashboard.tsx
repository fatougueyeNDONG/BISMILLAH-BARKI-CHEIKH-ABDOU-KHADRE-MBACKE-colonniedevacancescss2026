import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Users, UserCheck, Clock, TrendingUp, Award, HandMetal } from 'lucide-react';

export default function AdminDashboard() {
  const { token } = useAuth();
  const { enfants, getListeFinale, parents, settings } = useInscription();
  const [apiStats, setApiStats] = useState<{
    total_demandes: number;
    selected_total: number;
    selected_by_liste: Record<string, number>;
    desistements_waiting: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!token) return;
      try {
        const stats = await apiRequest<{
          total_demandes: number;
          selected_total: number;
          selected_by_liste: Record<string, number>;
          desistements_waiting: number;
        }>('/admin/stats', { token });
        setApiStats(stats);
      } catch {
        setApiStats(null);
      }
    };
    loadStats();
  }, [token]);

  const principale = apiStats?.selected_by_liste?.principale ?? enfants.filter(e => e.liste === 'principale').length;
  const n1 = apiStats?.selected_by_liste?.attente_n1 ?? enfants.filter(e => e.liste === 'attente_n1').length;
  const n2 = apiStats?.selected_by_liste?.attente_n2 ?? enfants.filter(e => e.liste === 'attente_n2').length;
  const total = apiStats?.total_demandes ?? enfants.length;
  const totalParents = new Set(enfants.map(e => e.parentMatricule)).size;
  const listeFinale = getListeFinale();
  const desistementsEnAttente = apiStats?.desistements_waiting ?? enfants.filter(e => e.desistement === 'demandé').length;

  const capaciteLabel = settings.capaciteMax !== null ? settings.capaciteMax : '∞';
  const selectedTotal = apiStats?.selected_total ?? listeFinale.length;
  const retenuLabel = settings.capaciteMax !== null ? `${selectedTotal}/${settings.capaciteMax}` : `${selectedTotal} (Non défini)`;
  const fillPercent = settings.capaciteMax !== null && settings.capaciteMax > 0 ? Math.min((selectedTotal / settings.capaciteMax) * 100, 100) : 0;

  const stats = [
    { label: 'Total inscriptions', value: total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Liste Principale', value: principale, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "Liste d'attente N°1", value: n1, icon: Clock, color: 'text-accent', bg: 'bg-accent/10' },
    { label: "Liste d'attente N°2", value: n2, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Retenus (finale)', value: retenuLabel, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Désistements en attente', value: desistementsEnAttente, icon: HandMetal, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const donutData = [
    { label: 'Principale', value: principale, color: '#10b981' },
    { label: 'N°1', value: n1, color: 'hsl(35, 92%, 54%)' },
    { label: 'N°2', value: n2, color: 'hsl(221, 83%, 53%)' },
  ];
  const donutTotal = principale + n1 + n2;
  let cumulativePercent = 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble — Colonie de Vacances 2026</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="bg-card rounded-2xl shadow-card border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground leading-tight max-w-[60%]">{s.label}</p>
              <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            </div>
            <span className="text-xl font-bold text-foreground">{s.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl shadow-card border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Répartition des listes</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {donutData.map((d, i) => {
                  const percent = donutTotal > 0 ? (d.value / donutTotal) * 100 : 0;
                  const circumference = Math.PI * 70;
                  const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                  cumulativePercent += percent;
                  return <circle key={i} cx="50" cy="50" r="35" fill="none" stroke={d.color} strokeWidth="12" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{donutTotal}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-6">
            {donutData.map(d => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-muted-foreground">{d.label}: {d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-xl shadow-card border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Activité récente</h3>
          <div className="space-y-3">
            {enfants.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune activité locale. Les données réelles sont chargées via API.</p>
            )}
            {enfants.slice(-5).reverse().map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`w-2 h-2 rounded-full ${e.liste === 'principale' ? 'bg-emerald-500' : e.liste === 'attente_n1' ? 'bg-accent' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.prenom} {e.nom}</p>
                  <p className="text-xs text-muted-foreground">Par {parents.find(p => p.matricule === e.parentMatricule)?.prenom || 'N/A'}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{new Date(e.dateInscription).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-xl shadow-card border border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Taux de remplissage — Liste finale</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {totalParents} parents — {retenuLabel} enfants retenus
          </div>
        </div>
        {settings.capaciteMax !== null ? (
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${fillPercent}%` }} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Capacité non définie — pas de limite de remplissage.</p>
        )}
      </motion.div>
    </div>
  );
}
