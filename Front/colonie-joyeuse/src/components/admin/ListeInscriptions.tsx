import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportStyledExcel } from '@/lib/excelExport';

export default function ListeInscriptions() {
  const { enfants, parents } = useInscription();
  const [searchTerm, setSearchTerm] = useState('');

  const calculateAge = (dateNaissance: string) => {
    const birthDate = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  /** Le rang affiché est l'index visuel dans le tableau trié chronologiquement. */
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
      case 'principale': return 'Principale';
      case 'attente_n1': return "N°1";
      case 'attente_n2': return "N°2";
      default: return liste;
    }
  };

  const sortedEnfants = [...enfants].sort(
    (a, b) => new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime()
  );

  const filtered = sortedEnfants.filter(e => {
    if (!searchTerm) return true;
    const p = parents.find(x => x.matricule === e.parentMatricule);
    const s = searchTerm.toLowerCase();
    return e.parentMatricule.toLowerCase().includes(s) || e.nom.toLowerCase().includes(s) || e.prenom.toLowerCase().includes(s) || (p?.nom || '').toLowerCase().includes(s);
  });
  const rangByDemandeId = new Map(sortedEnfants.map((e, i) => [e.id, i + 1]));

  const generateData = () => {
    const headers = ['Rang', 'Matricule', 'Nom Parent', 'Prénom Parent', 'Service', 'Nom Enfant', 'Prénom Enfant', 'Âge', 'Sexe', 'Statut', 'Liste', 'Inscrit le'];
    const rows = filtered.map((e) => {
      const p = parents.find(x => x.matricule === e.parentMatricule);
      const rang = rangByDemandeId.get(e.id) ?? '';
      return [rang, e.parentMatricule, p?.nom || '', p?.prenom || '', p?.service || '', e.nom, e.prenom, calculateAge(e.dateNaissance), e.sexe === 'M' ? 'M' : 'F', e.statut, getListeLabel(e.liste), new Date(e.dateInscription).toLocaleDateString('fr-FR')];
    });
    return { headers, rows };
  };

  const exportExcel = () => {
    const { headers, rows } = generateData();
    exportStyledExcel(headers, rows, 'Inscriptions', 'inscriptions.xlsx');
  };

  const exportPDF = () => {
    const { headers, rows } = generateData();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Toutes les inscriptions', 14, 15);
    doc.setFontSize(10);
    doc.text(`${filtered.length} inscription(s)`, 14, 22);
    autoTable(doc, {
      head: [headers],
      body: rows.map(r => r.map(c => String(c))),
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save('inscriptions.pdf');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Toutes les inscriptions</h1>
          <p className="text-muted-foreground mt-1">
            {enfants.length} inscription(s) — la colonne Rang correspond à la position affichée (ordre chronologique)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportExcel} variant="outline" className="gap-2 rounded-lg">
            <FileDown className="w-4 h-4" />Export Excel
          </Button>
          <Button onClick={exportPDF} variant="outline" className="gap-2 rounded-lg">
            <FileDown className="w-4 h-4" />Export PDF
          </Button>
        </div>
      </motion.div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
      </div>

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
                <TableHead className="font-semibold">Liste</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold">Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const p = parents.find(x => x.matricule === e.parentMatricule);
                const rang = rangByDemandeId.get(e.id) ?? '—';
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-bold text-foreground text-center">{rang}</TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{e.parentMatricule}</TableCell>
                    <TableCell>{p?.nom || '—'}</TableCell>
                    <TableCell>{p?.prenom || '—'}</TableCell>
                    <TableCell className="text-sm">{p?.service || '—'}</TableCell>
                    <TableCell>{e.prenom}</TableCell>
                    <TableCell className="font-medium">{e.nom}</TableCell>
                    <TableCell>{calculateAge(e.dateNaissance)} ans</TableCell>
                    <TableCell>{e.sexe === 'M' ? 'M' : 'F'}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{getListeLabel(e.liste)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatutBadge(e.statut)}`}>{e.statut}</span>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">{new Date(e.dateInscription).toLocaleDateString('fr-FR')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
