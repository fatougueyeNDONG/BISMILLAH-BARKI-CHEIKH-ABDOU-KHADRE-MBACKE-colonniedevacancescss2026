import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Eye } from 'lucide-react';

function calculateAge(dateNaissance: string): number {
  const birth = new Date(dateNaissance);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ToutesInscriptions() {
  const { enfants, parents } = useInscription();
  const [searchTerm, setSearchTerm] = useState('');

  const sortedEnfants = [...enfants].sort((a, b) =>
    new Date(a.dateInscription).getTime() - new Date(b.dateInscription).getTime()
  );

  const getListeLabel = (liste: string) => {
    switch (liste) {
      case 'principale': return 'Liste Principale';
      case 'attente_n1': return "Liste N°1";
      case 'attente_n2': return "Liste N°2";
      default: return liste;
    }
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'Titulaire': return 'bg-emerald-50 text-emerald-700';
      case 'Suppléant N1': return 'bg-accent/10 text-accent';
      case 'Suppléant N2': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
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

  const getRang = (enfant: typeof enfants[0]) => {
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
              Consultez l'ensemble des inscriptions — {enfants.length} inscription(s) au total
            </p>
          </div>
        </div>
      </motion.div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-accent">ℹ️ Information :</strong> Cette liste est en consultation uniquement. Elle permet à chaque parent de vérifier la transparence du processus d'inscription.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par matricule, nom..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl shadow-card border border-border">
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
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Aucune inscription</TableCell></TableRow>
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
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{getListeLabel(e.liste)}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${getStatutBadge(e.statut)}`}>{e.statut}</span>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">{new Date(e.dateInscription).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
