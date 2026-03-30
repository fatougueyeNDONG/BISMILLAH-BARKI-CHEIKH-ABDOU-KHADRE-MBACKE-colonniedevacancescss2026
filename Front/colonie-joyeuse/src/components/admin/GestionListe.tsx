import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { Enfant } from '@/data/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Eye, Search, Filter, ArrowRightLeft, CheckCircle2, HandMetal, ThumbsUp, ThumbsDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportStyledExcel } from '@/lib/excelExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface Props {
  type: 'principale' | 'attente_n1' | 'attente_n2';
}

export default function GestionListe({ type }: Props) {
  const { getEnfantsByListe, transfererEnfant, validerDesistement, validerEnfant, refuserEnfant, parents, getRangDansListe, isListeFinaleComplete, settings } = useInscription();
  const enfants = getEnfantsByListe(type);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSexe, setFilterSexe] = useState<string>('all');
  const [filterDesistement, setFilterDesistement] = useState<string>('all');
  const calculateAge = (dateNaissance: string) => {
    const birthDate = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const [detailEnfant, setDetailEnfant] = useState<Enfant | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Enfant | null>(null);
  const [transferListe, setTransferListe] = useState<string>('');
  const [confirmDesistOpen, setConfirmDesistOpen] = useState(false);
  const [desistTarget, setDesistTarget] = useState<Enfant | null>(null);
  const [refusOpen, setRefusOpen] = useState(false);
  const [refusTarget, setRefusTarget] = useState<Enfant | null>(null);
  const [motifRefus, setMotifRefus] = useState('');

  const inscriptionsCloturees = (() => {
    if (!settings.dateFinInscriptions) return false;
    const fin = new Date(settings.dateFinInscriptions);
    fin.setHours(23, 59, 59, 999);
    return new Date() > fin;
  })();

  const titles: Record<string, string> = {
    principale: 'Liste Principale',
    attente_n1: "Liste d'Attente N°1",
    attente_n2: "Liste d'Attente N°2",
  };

  const dotColors: Record<string, string> = {
    principale: 'bg-emerald-500',
    attente_n1: 'bg-accent',
    attente_n2: 'bg-primary',
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'Titulaire': return 'bg-emerald-50 text-emerald-700';
      case 'Suppléant N1': return 'bg-accent/10 text-accent';
      case 'Suppléant N2': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTransferOptions = () => {
    const options: { value: string; label: string }[] = [];
    if (type !== 'principale') options.push({ value: 'principale', label: 'Liste Principale' });
    if (type !== 'attente_n1') options.push({ value: 'attente_n1', label: "Liste d'Attente N°1" });
    if (type !== 'attente_n2') options.push({ value: 'attente_n2', label: "Liste d'Attente N°2" });
    return options;
  };

  const filteredEnfants = enfants.filter(e => {
    const p = parents.find(x => x.matricule === e.parentMatricule);
    const matchSearch = searchTerm === '' ||
      e.parentMatricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p?.prenom || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSexe = filterSexe === 'all' || e.sexe === filterSexe;
    const matchDesist = filterDesistement === 'all' ||
      (filterDesistement === 'demandé' && e.desistement === 'demandé') ||
      (filterDesistement === 'validé' && e.desistement === 'validé') ||
      (filterDesistement === 'aucun' && !e.desistement) ||
      (filterDesistement === 'reinscrit' && e.reinscrit === true) ||
      (filterDesistement === 'refusé' && e.validation === 'refusé');
    return matchSearch && matchSexe && matchDesist;
  });
  const rangByDemandeId = new Map(enfants.map((e, i) => [e.id, i + 1]));

  const handleTransfer = async () => {
    if (!transferTarget || !transferListe) return;
    try {
      await transfererEnfant(transferTarget.id, transferListe as any);
      toast({ title: '✅ Demande transférée', description: `${transferTarget.prenom} ${transferTarget.nom} a été transféré(e) vers la ${titles[transferListe] || transferListe}.` });
      setTransferOpen(false); setTransferTarget(null); setTransferListe('');
    } catch (error) {
      toast({ title: '❌ Erreur', description: error instanceof Error ? error.message : "Échec du transfert.", variant: 'destructive' });
    }
  };

  const handleValiderDesistement = async () => {
    if (!desistTarget) return;
    try {
      await validerDesistement(desistTarget.id);
      toast({ title: '✅ Désistement validé', description: `Le désistement de ${desistTarget.prenom} ${desistTarget.nom} a été validé.` });
      setConfirmDesistOpen(false); setDesistTarget(null);
    } catch (error) {
      toast({ title: '❌ Erreur', description: error instanceof Error ? error.message : "Échec de validation du désistement.", variant: 'destructive' });
    }
  };

  const handleValider = async (enfant: Enfant) => {
    if (isListeFinaleComplete()) {
      toast({ title: '⚠️ Liste finale complète', description: `Impossible de valider. La liste finale a atteint sa capacité maximale de ${settings.capaciteMax} enfants. Le Super Admin peut augmenter la capacité dans les Paramètres.`, variant: 'destructive' });
      return;
    }
    try {
      await validerEnfant(enfant.id);
      toast({ title: '✅ Demande validée', description: `${enfant.prenom} ${enfant.nom} a été ajouté(e) à la liste finale des retenus.` });
    } catch (error) {
      toast({ title: '❌ Erreur', description: error instanceof Error ? error.message : "Échec de validation de la demande.", variant: 'destructive' });
    }
  };

  const handleRefuser = async () => {
    if (!refusTarget || !motifRefus.trim()) return;
    try {
      await refuserEnfant(refusTarget.id, motifRefus.trim());
      toast({ title: '❌ Demande refusée', description: `${refusTarget.prenom} ${refusTarget.nom} — Motif : ${motifRefus}` });
      setRefusOpen(false); setRefusTarget(null); setMotifRefus('');
    } catch (error) {
      toast({ title: '❌ Erreur', description: error instanceof Error ? error.message : "Échec du refus de la demande.", variant: 'destructive' });
    }
  };

  const generateCSV = () => {
    const headers = ['Rang', 'Matricule', 'Nom Parent', 'Prénom Parent', 'Service', 'Nom Enfant', 'Prénom Enfant', 'Âge', 'Sexe', 'Statut', 'Décision', 'Désistement'];
    const rows = filteredEnfants.map((e) => {
      const p = parents.find(x => x.matricule === e.parentMatricule);
      return [rangByDemandeId.get(e.id) ?? '', e.parentMatricule, p?.nom || '', p?.prenom || '', p?.service || '', e.nom, e.prenom, calculateAge(e.dateNaissance), e.sexe === 'M' ? 'Masculin' : 'Féminin', e.statut, e.validation || 'en_attente', e.desistement || 'Aucun'];
    });
    return { headers, rows };
  };

  const exportExcel = () => {
    const { headers, rows } = generateCSV();
    exportStyledExcel(headers, rows, type, `${type}.xlsx`);
  };

  const exportPDF = () => {
    const { headers, rows } = generateCSV();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(titles[type], 14, 15);
    doc.setFontSize(10);
    doc.text(`Total : ${filteredEnfants.length} enfant(s)`, 14, 22);
    autoTable(doc, {
      head: [headers],
      body: rows.map(r => r.map(c => String(c))),
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`${type}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${dotColors[type]}`} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{titles[type]}</h1>
            <p className="text-muted-foreground mt-1"><strong>{enfants.length}</strong> enfant(s) — classés par ordre d'arrivée</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportExcel} variant="outline" className="gap-2 rounded-lg"><FileDown className="w-4 h-4" />Export Excel</Button>
          <Button onClick={exportPDF} variant="outline" className="gap-2 rounded-lg"><FileDown className="w-4 h-4" />Export PDF</Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par matricule, nom..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <Select value={filterSexe} onValueChange={setFilterSexe}>
          <SelectTrigger className="w-[140px] rounded-lg"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Sexe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="M">Masculin</SelectItem>
            <SelectItem value="F">Féminin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDesistement} onValueChange={setFilterDesistement}>
          <SelectTrigger className="w-[180px] rounded-lg"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Désistement" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="aucun">Sans désistement</SelectItem>
            <SelectItem value="demandé">Désistement demandé</SelectItem>
            <SelectItem value="validé">Désistement validé</SelectItem>
            <SelectItem value="reinscrit">Enfant réinscrit</SelectItem>
            <SelectItem value="refusé">Enfants refusés</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {!inscriptionsCloturees && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-800 text-sm">
          <span>⏳</span>
          <span>Les validations (Approuver/Refuser) seront disponibles après la clôture des inscriptions le <strong>{new Date(settings.dateFinInscriptions).toLocaleDateString('fr-FR')}</strong>.</span>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl shadow-card border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold w-16">Rang</TableHead>
                <TableHead className="font-semibold">Matricule</TableHead>
                <TableHead className="font-semibold">Nom du parent</TableHead>
                <TableHead className="font-semibold">Prénom du parent</TableHead>
                <TableHead className="font-semibold">Service</TableHead>
                <TableHead className="font-semibold">Prénom Enfant</TableHead>
                <TableHead className="font-semibold">Nom Enfant</TableHead>
                <TableHead className="font-semibold">Âge</TableHead>
                <TableHead className="font-semibold">Sexe</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Décision</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnfants.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">Aucun enfant dans cette liste</TableCell></TableRow>
              ) : (
                filteredEnfants.map((e) => {
                  const p = parents.find(x => x.matricule === e.parentMatricule);
                  const rang = rangByDemandeId.get(e.id) ?? '—';
                  const validation = e.validation || 'en_attente';
                  return (
                    <TableRow key={e.id} className={e.desistement === 'validé' ? 'opacity-50' : ''}>
                      <TableCell className="font-bold text-foreground text-center">{rang}</TableCell>
                      <TableCell className="font-mono tabular-nums text-sm">{e.parentMatricule}</TableCell>
                      <TableCell>{p?.nom || '—'}</TableCell>
                      <TableCell>{p?.prenom || '—'}</TableCell>
                      <TableCell className="text-sm">{p?.service || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {e.prenom}
                          {e.reinscrit && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">Réinscrit</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{e.nom}</TableCell>
                      <TableCell>{calculateAge(e.dateNaissance)} ans</TableCell>
                      <TableCell>{e.sexe === 'M' ? 'M' : 'F'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatutBadge(e.statut)}`}>{e.statut}</span>
                          {e.desistement === 'demandé' && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">⏳ Désistement</span>}
                          {e.desistement === 'validé' && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">Désisté</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {validation === 'validé' && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">✅ Approuvé</span>}
                        {validation === 'refusé' && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">❌ Refusé</span>}
                        {validation === 'en_attente' && <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">En attente</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {validation === 'en_attente' && !e.desistement && (
                            <>
                              <Button size="sm" disabled={!inscriptionsCloturees} onClick={() => handleValider(e)} className="gap-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                 <ThumbsUp className="w-3 h-3" />Approuver
                               </Button>
                               <Button size="sm" disabled={!inscriptionsCloturees} onClick={() => { setRefusTarget(e); setRefusOpen(true); }} className="gap-1 text-xs rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground h-7 px-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                 <ThumbsDown className="w-3 h-3" />Refuser
                              </Button>
                            </>
                          )}
                          {e.desistement === 'demandé' && (
                            <Button size="sm" onClick={() => { setDesistTarget(e); setConfirmDesistOpen(true); }} className="gap-1 text-xs rounded-lg bg-accent hover:bg-accent/90 text-white h-7 px-2">
                              <CheckCircle2 className="w-3 h-3" />Valider désist.
                            </Button>
                          )}
                          {!e.desistement && validation !== 'refusé' && (
                            <Button size="sm" variant="outline" onClick={() => { setTransferTarget(e); setTransferOpen(true); }} className="gap-1 text-xs rounded-lg h-7 px-2">
                              <ArrowRightLeft className="w-3 h-3" />Transférer
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDetailEnfant(e)} className="gap-1 text-xs rounded-lg h-7 px-2">
                            <Eye className="w-3 h-3" />Détails
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
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!detailEnfant} onOpenChange={() => setDetailEnfant(null)}>
        <DialogContent className="sm:max-w-lg rounded-xl">
          <DialogHeader><DialogTitle className="text-foreground">Détails de la demande</DialogTitle></DialogHeader>
          {detailEnfant && (() => {
            const p = parents.find(x => x.matricule === detailEnfant.parentMatricule);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {detailEnfant.validation === 'validé' && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">✅ Validé (OUI)</span>}
                  {detailEnfant.validation === 'refusé' && (
                    <div><span className="text-xs font-semibold px-3 py-1 rounded-full bg-destructive/10 text-destructive">❌ Refusé (NON)</span>
                    {detailEnfant.motifRefus && <p className="text-xs text-destructive mt-1">Motif : {detailEnfant.motifRefus}</p>}</div>
                  )}
                  {detailEnfant.desistement && <span className={`text-xs font-semibold px-3 py-1 rounded-full ${detailEnfant.desistement === 'validé' ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-700'}`}>{detailEnfant.desistement === 'validé' ? '✓ Désistement validé' : '⏳ Désistement en attente'}</span>}
                  {detailEnfant.reinscrit && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">Réinscrit</span>}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground border-b border-border pb-1">Parent</h3>
                    <div><span className="text-muted-foreground">Matricule :</span> <span className="font-mono">{detailEnfant.parentMatricule}</span></div>
                    <div><span className="text-muted-foreground">Nom :</span> {p?.nom}</div>
                    <div><span className="text-muted-foreground">Prénom :</span> {p?.prenom}</div>
                    <div><span className="text-muted-foreground">Service :</span> {p?.service}</div>
                    <div><span className="text-muted-foreground">Email :</span> {p?.email || '—'}</div>
                    <div><span className="text-muted-foreground">Tél :</span> {p?.telephone || '—'}</div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground border-b border-border pb-1">Enfant</h3>
                    <div><span className="text-muted-foreground">Nom :</span> {detailEnfant.nom}</div>
                    <div><span className="text-muted-foreground">Prénom :</span> {detailEnfant.prenom}</div>
                    <div><span className="text-muted-foreground">Âge :</span> {calculateAge(detailEnfant.dateNaissance)} ans</div>
                    <div><span className="text-muted-foreground">Sexe :</span> {detailEnfant.sexe === 'M' ? 'Masculin' : 'Féminin'}</div>
                    <div><span className="text-muted-foreground">Lien :</span> {detailEnfant.lienParente}</div>
                    <div><span className="text-muted-foreground">Rang :</span> {getRangDansListe(detailEnfant.id)}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">Inscrit le {new Date(detailEnfant.dateInscription).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Transférer la demande</DialogTitle>
            <DialogDescription>Transférer {transferTarget?.prenom} {transferTarget?.nom} vers une autre liste.</DialogDescription>
          </DialogHeader>
          <Select value={transferListe} onValueChange={setTransferListe}>
            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Choisir la liste de destination" /></SelectTrigger>
            <SelectContent>{getTransferOptions().map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleTransfer} disabled={!transferListe} className="rounded-lg bg-primary text-primary-foreground">Transférer</Button>
          </DialogFooter>
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

      {/* Refus Dialog */}
      <Dialog open={refusOpen} onOpenChange={setRefusOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><ThumbsDown className="w-5 h-5 text-destructive" /></div>
              <DialogTitle className="text-foreground">Refuser la demande</DialogTitle>
            </div>
            <DialogDescription className="pt-2">Vous êtes sur le point de refuser la demande de <strong>{refusTarget?.prenom} {refusTarget?.nom}</strong>. Veuillez indiquer le motif du refus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif du refus *</Label>
            <Textarea value={motifRefus} onChange={e => setMotifRefus(e.target.value)} placeholder="Indiquez le motif du refus..." className="rounded-lg min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRefusOpen(false); setMotifRefus(''); }} className="rounded-lg">Annuler</Button>
            <Button onClick={handleRefuser} disabled={!motifRefus.trim()} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">Refuser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
