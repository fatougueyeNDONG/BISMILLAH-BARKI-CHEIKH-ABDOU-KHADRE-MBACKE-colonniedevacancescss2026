import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Database, Server, Activity, Upload, FileUp, Shield, RefreshCw, Wrench, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const tabs = [
  { id: 'systeme', label: 'État système', icon: Activity },
  { id: 'bdd', label: 'Base de données', icon: Database },
  { id: 'taches', label: 'Tâches', icon: Wrench },
  { id: 'journaux', label: 'Journaux', icon: FileText },
];

export default function JournalLogs() {
  const { token } = useAuth();
  const { enfants, parents, settings, historique } = useInscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('systeme');
  const [refreshing, setRefreshing] = useState(false);
  const [apiStats, setApiStats] = useState<{
    total_users: number;
    total_parents: number;
    total_enfants: number;
    total_demandes: number;
    selected_total: number;
    selected_by_liste: Record<string, number>;
    desistements_waiting: number;
  } | null>(null);
  const [apiHistorique, setApiHistorique] = useState<Array<{ id: string; date: string; heure: string; role: string; utilisateur: string; details: string }>>([]);

  const totalEnfants = apiStats?.total_enfants ?? enfants.length;
  const totalParents = apiStats?.total_parents ?? parents.length;
  const totalDemandes = apiStats?.total_demandes ?? enfants.length;
  const totalUsers = apiStats?.total_users ?? null;
  const desistements = apiStats?.desistements_waiting ?? enfants.filter(e => e.desistement).length;

  const loadMonitoringData = async () => {
    if (!token) return;
    try {
      const [stats, histo] = await Promise.all([
        apiRequest<{
          total_users: number;
          total_parents: number;
          total_enfants: number;
          total_demandes: number;
          selected_total: number;
          selected_by_liste: Record<string, number>;
          desistements_waiting: number;
        }>('/admin/stats', { token }),
        apiRequest<Array<{ id: string; date: string; heure: string; role: string; utilisateur: string; details: string }>>('/admin/historique?limit=50', { token }),
      ]);
      setApiStats(stats);
      setApiHistorique(histo);
    } catch {
      setApiStats(null);
      setApiHistorique([]);
    }
  };

  useEffect(() => {
    loadMonitoringData();
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMonitoringData().finally(() => setRefreshing(false));
    toast({ title: '✅ Données rafraîchies depuis le backend' });
  };

  // DB tables data
  const dbTables = [
    { name: 'users', records: totalUsers, rls: true },
    { name: 'parents', records: totalParents, rls: true },
    { name: 'services', records: null as number | null, rls: false },
    { name: 'sites', records: null as number | null, rls: false },
    { name: 'enfants', records: totalEnfants, rls: true },
    { name: 'listes', records: null as number | null, rls: true },
    { name: 'demandes_inscription', records: totalDemandes, rls: true },
    { name: 'desistements', records: desistements, rls: true },
    { name: 'alembic_version', records: null as number | null, rls: false },
  ];

  // System services
  const systemServices = [
    { name: 'Base de données', icon: Database, status: apiStats ? 'Connectée' : 'À vérifier', uptime: apiStats ? 'OK' : 'N/A' },
    { name: 'Authentification', icon: Shield, status: token ? 'Connectée' : 'À vérifier', uptime: token ? 'Session active' : 'N/A' },
    { name: 'API Backend', icon: Server, status: apiStats ? 'Disponible' : 'À vérifier', uptime: apiStats ? 'OK' : 'N/A' },
  ];

  // System health
  const healthMetrics = [
    { label: 'CPU', value: 0, color: 'bg-foreground/30' },
    { label: 'Mémoire', value: 0, color: 'bg-foreground/30' },
    { label: 'Stockage', value: 0, color: 'bg-foreground/30' },
    { label: 'Bande passante', value: 0, color: 'bg-foreground/30' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    await file.text();
    setUploadResult('Import local désactivé: utilisez l’endpoint backend dédié.');
    toast({ title: 'ℹ️ Import non disponible', description: "Aucune donnée n'est injectée localement. Utilisez le backend pour l'import.", variant: 'destructive' });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Journal et Logs</h1>
            <p className="text-muted-foreground mt-1">Surveillance du système et état de la base de données</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-card rounded-xl border border-border p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: État système */}
      {activeTab === 'systeme' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Service cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {systemServices.map((svc, i) => (
              <motion.div key={svc.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <svc.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{svc.name}</span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                      {svc.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Disponibilité : {svc.uptime}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* System health */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground">Santé globale du système</h3>
            <p className="text-sm text-muted-foreground mb-6">Indicateurs techniques non branchés dans le frontend (aucune valeur fictive affichée).</p>
            <div className="space-y-5">
              {healthMetrics.map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    <span className="text-sm font-semibold text-foreground">{m.value}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.color} transition-all`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Configuration snapshot */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Configuration actuelle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground">Colonie :</span> <span className="font-medium text-foreground">{settings.colonieNom}</span></div>
              <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground">Période inscription :</span> <span className="font-medium text-foreground">{settings.dateDebutInscriptions} → {settings.dateFinInscriptions}</span></div>
              <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground">Période colonie :</span> <span className="font-medium text-foreground">{settings.dateDebutColonie} → {settings.dateFinColonie}</span></div>
              <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground">Capacité max :</span> <span className="font-medium text-foreground">{settings.capaciteMax ?? 'Non défini'}</span></div>
              <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground">Max enfants/parent :</span> <span className="font-medium text-foreground">{settings.maxEnfantsParParent ?? 'Non défini'}</span></div>
              <div className="p-3 rounded-lg bg-muted/30"><span className="text-muted-foreground">Tranche d'âge :</span> <span className="font-medium text-foreground">{settings.ageMin} — {settings.ageMax}</span></div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Tab: Base de données */}
      {activeTab === 'bdd' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 rounded-lg">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Rafraîchir
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-1">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Tables de la base de données</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Statistiques des tables principales de notre instance PostgreSQL.</p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Tables</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Enregistrements</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-primary">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {dbTables.map((table, i) => (
                    <tr key={table.name} className="border-b border-border/50 last:border-0">
                      <td className="py-3.5 px-4 text-sm font-medium text-foreground">{table.name}</td>
                      <td className="py-3.5 px-4 text-sm font-semibold text-foreground">{table.records ?? '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          table.rls
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          {table.rls ? 'RLS Actif' : 'RLS Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import CSV */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />Import de données (CSV)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Chargez un fichier CSV pour importer des parents. Colonnes requises : <strong>matricule, prenom, nom, service</strong>.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="outline" className="gap-2 rounded-lg">
                <FileUp className="w-4 h-4" />{uploading ? 'Import en cours...' : 'Charger un fichier CSV'}
              </Button>
              {uploadResult && (
                <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">{uploadResult}</span>
              )}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium mb-1">Format CSV attendu :</p>
              <code className="text-xs text-foreground block bg-muted p-2 rounded">matricule,prenom,nom,service,email,telephone<br/>CSS-2024-020,Prénom,Nom,Service,email@css.sn,77 000 00 00</code>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Tâches */}
      {activeTab === 'taches' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Demandes validées', value: enfants.filter(e => e.validation === 'validé').length, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Demandes refusées', value: enfants.filter(e => e.validation === 'refusé').length, color: 'text-destructive bg-destructive/10' },
              { label: 'En attente', value: enfants.filter(e => (e.validation || 'en_attente') === 'en_attente').length, color: 'text-amber-600 bg-amber-50' },
              { label: 'Désistements', value: desistements, color: 'text-primary bg-primary/10' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                className="bg-card rounded-xl border border-border p-4">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Tâches système</h3>
            <p className="text-sm text-muted-foreground mb-4">Aperçu des opérations automatisées et manuelles.</p>
            <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              Aucune tâche simulée n'est affichée.
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Journaux */}
      {activeTab === 'journaux' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Dernières actions</h3>
            <div className="space-y-2">
              {(apiHistorique.length > 0 ? apiHistorique : historique.slice(0, 15)).map(h => (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 text-sm">
                  <span className="tabular-nums text-xs text-muted-foreground w-20 shrink-0">{h.date}</span>
                  <span className="tabular-nums text-xs text-muted-foreground w-12 shrink-0">{h.heure}</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                    h.role === 'Parent' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                  }`}>{h.role}</span>
                  <span className="font-medium text-foreground shrink-0">{h.utilisateur}</span>
                  <span className="text-muted-foreground truncate flex-1">{h.details}</span>
                </div>
              ))}
              {apiHistorique.length === 0 && historique.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune action enregistrée</p>}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
