import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { calculateAge, Enfant } from '@/data/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Search, Filter, Eye, Award, CheckCircle2, HandMetal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { exportStyledExcel } from '@/lib/excelExport';

export default function ListeFinale() {
  const { getListeFinale, getEnfantsDesistesFinale, validerDesistement, parents, settings, addHistorique, isListeFinaleComplete } = useInscription();
  const enfantsRetenus = getListeFinale();
  const enfantsDesistes = getEnfantsDesistesFinale();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSexe, setFilterSexe] = useState<string>('all');
  const [detailEnfant, setDetailEnfant] = useState<Enfant | null>(null);
  const [confirmDesistOpen, setConfirmDesistOpen] = useState(false);
  const [desistTarget, setDesistTarget] = useState<Enfant | null>(null);

  const capaciteLabel = settings.capaciteMax !== null ? settings.capaciteMax : '∞';
  const isComplete = isListeFinaleComplete();

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
      case 'attente_n1': return "Liste N°1";
      case 'attente_n2': return "Liste N°2";
      default: return liste;
    }
  };

  const filterList = (list: Enfant[]) => list.filter(e => {
    const p = parents.find(x => x.matricule === e.parentMatricule);
    const matchSearch = searchTerm === '' ||
      e.parentMatricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p?.nom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSexe = filterSexe === 'all' || e.sexe === filterSexe;
    return matchSearch && matchSexe;
  });

  const filteredRetenus = filterList(enfantsRetenus);
  const filteredDesistes = filterList(enfantsDesistes);

  const handleValiderDesistement = () => {
    if (!desistTarget) return;
    validerDesistement(desistTarget.id);
    addHistorique({ utilisateur: 'Gestionnaire', role: 'Admin', action: 'Validation désistement (finale)', details: `A validé le désistement de ${desistTarget.prenom} ${desistTarget.nom} depuis la liste finale`, cible: `${desistTarget.prenom} ${desistTarget.nom}` });
    toast({ title: '✅ Désistement validé', description: `${desistTarget.prenom} ${desistTarget.nom} a été retiré(e) de la liste finale.` });
    setConfirmDesistOpen(false); setDesistTarget(null);
  };

  const exportList = (list: Enfant[], filename: string, format: 'csv' | 'pdf') => {
    const headers = ['Rang', 'Matricule', 'Nom Parent', 'Prénom Parent', 'Service', 'Agence', 'Nom Enfant', 'Prénom Enfant', 'Âge', 'Sexe', 'Statut', "Liste d'origine"];
    const rows = list.map((e, i) => {
      const p = parents.find(x => x.matricule === e.parentMatricule);
      return [i + 1, e.parentMatricule, p?.nom || '', p?.prenom || '', p?.service || '', p?.site || '', e.nom, e.prenom, calculateAge(e.dateNaissance), e.sexe === 'M' ? 'Masculin' : 'Féminin', e.statut, getListeLabel(e.liste)];
    });

    if (format === 'csv') {
      exportStyledExcel(headers, rows, 'Liste Finale', `${filename}.xlsx`);
    } else {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Liste finale des enfants retenus', 14, 15);
      doc.setFontSize(10);
      doc.text(`${list.length}/${capaciteLabel} enfant(s)`, 14, 22);
      autoTable(doc, {
        head: [headers],
        body: rows.map(r => r.map(c => String(c))),
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129] },
      });
      doc.save(`${filename}.pdf`);
    }
  };

  const renderTable = (list: Enfant[], showDesistAction: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold w-16">Rang</TableHead>
            <TableHead className="font-semibold">Matricule</TableHead>
            <TableHead className="font-semibold">Nom du parent</TableHead>
            <TableHead className="font-semibold">Prénom du parent</TableHead>
            <TableHead className="font-semibold">Service</TableHead>
            <TableHead className="font-semibold">Agence</TableHead>
            <TableHead className="font-semibold">Prénom Enfant</TableHead>
            <TableHead className="font-semibold">Nom Enfant</TableHead>
            <TableHead className="font-semibold">Âge</TableHead>
            <TableHead className="font-semibold">Sexe</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            <TableHead className="font-semibold">Liste d'origine</TableHead>
            <TableHead className="font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow><TableCell colSpan={13} className="text-center py-12 text-muted-foreground">Aucun enfant</TableCell></TableRow>
          ) : (
            list.map((e, i) => {
              const p = parents.find(x => x.matricule === e.parentMatricule);
              return (
                <TableRow key={e.id} className={e.desistement === 'validé' ? 'opacity-60' : ''}>
                  <TableCell className="font-bold text-foreground text-center">{i + 1}</TableCell>
                  <TableCell className="font-mono tabular-nums text-sm">{e.parentMatricule}</TableCell>
                  <TableCell>{p?.nom || '—'}</TableCell>
                  <TableCell>{p?.prenom || '—'}</TableCell>
                  <TableCell className="text-sm">{p?.service || '—'}</TableCell>
                  <TableCell className="text-sm">{p?.site || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {e.prenom}
                      {e.reinscrit && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">Réinscrit</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{e.nom}</TableCell>
                  <TableCell>{calculateAge(e.dateNaissance)} ans</TableCell>
                  <TableCell>{e.sexe === 'M' ? 'M' : 'F'}</TableCell>
                  <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatutBadge(e.statut)}`}>{e.statut}</span></TableCell>
                  <TableCell><span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{getListeLabel(e.liste)}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {showDesistAction && e.desistement === 'demandé' && (
                        <Button size="sm" onClick={() => { setDesistTarget(e); setConfirmDesistOpen(true); }} className="gap-1 text-xs rounded-lg bg-accent hover:bg-accent/90 text-white h-7 px-2">
                          <CheckCircle2 className="w-3 h-3" />Valider désist.
                        </Button>
                      )}
                      {showDesistAction && e.desistement === 'validé' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">Désisté ✓</span>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setDetailEnfant(e)} className="gap-1 text-xs rounded-lg h-7">
                        <Eye className="w-3 h-3" />Voir détails
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Award className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Liste finale des enfants retenus</h1>
            <p className="text-muted-foreground mt-1"><strong>{enfantsRetenus.length}</strong>/{capaciteLabel} enfant(s) retenu(s) pour la colonie</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportList(filteredRetenus, 'liste_finale', 'csv')} variant="outline" className="gap-2 rounded-lg"><FileDown className="w-4 h-4" />Export Excel</Button>
          <Button onClick={() => exportList(filteredRetenus, 'liste_finale', 'pdf')} variant="outline" className="gap-2 rounded-lg"><FileDown className="w-4 h-4" />Export PDF</Button>
        </div>
      </motion.div>

      {/* Progress */}
      {settings.capaciteMax !== null && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Taux de remplissage</span>
            <span className="text-sm font-bold text-foreground">{enfantsRetenus.length}/{settings.capaciteMax}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min((enfantsRetenus.length / settings.capaciteMax) * 100, 100)}%` }} />
          </div>
          {isComplete ? (
            <p className="text-xs font-medium text-emerald-700 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ✅ La liste finale des retenus est complète ({settings.capaciteMax}/{settings.capaciteMax} enfants). Si vous souhaitez ajouter d'autres enfants, demandez au Super Admin d'augmenter la capacité dans les Paramètres.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">Il reste {settings.capaciteMax - enfantsRetenus.length} place(s) disponible(s).</p>
          )}
        </div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <Select value={filterSexe} onValueChange={setFilterSexe}>
          <SelectTrigger className="w-[140px] rounded-lg"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Sexe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="M">Masculin</SelectItem>
            <SelectItem value="F">Féminin</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="retenus">
        <TabsList className="rounded-lg">
          <TabsTrigger value="retenus" className="gap-2 rounded-lg"><Award className="w-4 h-4" />Enfants retenus ({enfantsRetenus.length})</TabsTrigger>
          <TabsTrigger value="desistes" className="gap-2 rounded-lg"><AlertTriangle className="w-4 h-4" />Enfants désistés ({enfantsDesistes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="retenus" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border">
            {renderTable(filteredRetenus, false)}
          </motion.div>
        </TabsContent>

        <TabsContent value="desistes" className="mt-4">
          {enfantsDesistes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Attention :</strong> Ces enfants étaient dans la liste finale mais leurs parents ont demandé un désistement. Validez le désistement pour retirer l'enfant ou consultez les détails.
              </p>
            </div>
          )}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border">
            {renderTable(filteredDesistes, true)}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailEnfant} onOpenChange={() => setDetailEnfant(null)}>
        <DialogContent className="sm:max-w-lg rounded-xl">
          <DialogHeader><DialogTitle className="text-foreground">Détails de l'enfant</DialogTitle></DialogHeader>
          {detailEnfant && (() => {
            const p = parents.find(x => x.matricule === detailEnfant.parentMatricule);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {detailEnfant.desistement === 'validé' && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-destructive/10 text-destructive">Désistement validé</span>}
                  {detailEnfant.desistement === 'demandé' && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700">⏳ Désistement demandé</span>}
                  {!detailEnfant.desistement && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">✅ Retenu</span>}
                  {detailEnfant.reinscrit && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">Réinscrit</span>}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground border-b border-border pb-1">Parent</h3>
                    <div><span className="text-muted-foreground">Matricule :</span> <span className="font-mono">{detailEnfant.parentMatricule}</span></div>
                    <div><span className="text-muted-foreground">Nom :</span> {p?.nom}</div>
                    <div><span className="text-muted-foreground">Prénom :</span> {p?.prenom}</div>
                    <div><span className="text-muted-foreground">Service :</span> {p?.service}</div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground border-b border-border pb-1">Enfant</h3>
                    <div><span className="text-muted-foreground">Nom :</span> {detailEnfant.nom}</div>
                    <div><span className="text-muted-foreground">Prénom :</span> {detailEnfant.prenom}</div>
                    <div><span className="text-muted-foreground">Âge :</span> {calculateAge(detailEnfant.dateNaissance)} ans</div>
                    <div><span className="text-muted-foreground">Sexe :</span> {detailEnfant.sexe === 'M' ? 'Masculin' : 'Féminin'}</div>
                    <div><span className="text-muted-foreground">Lien :</span> {detailEnfant.lienParente}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">Inscrit le {new Date(detailEnfant.dateInscription).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm Désistement */}
      <Dialog open={confirmDesistOpen} onOpenChange={setConfirmDesistOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><HandMetal className="w-5 h-5 text-amber-600" /></div>
              <DialogTitle className="text-foreground">Valider le désistement</DialogTitle>
            </div>
            <DialogDescription className="pt-2">Confirmez-vous la validation du désistement de <strong>{desistTarget?.prenom} {desistTarget?.nom}</strong> ?<br /><br />Cet enfant sera retiré de la liste finale des enfants retenus.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDesistOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleValiderDesistement} className="rounded-lg bg-accent text-white hover:bg-accent/90">Valider le désistement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
