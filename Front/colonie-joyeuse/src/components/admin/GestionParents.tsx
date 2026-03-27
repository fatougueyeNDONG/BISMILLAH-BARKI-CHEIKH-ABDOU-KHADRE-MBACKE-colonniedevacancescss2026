import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInscription } from '@/contexts/InscriptionContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Mail, Users, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function GestionParents() {
  const { parents, updateParent, addHistorique } = useInscription();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set());

  const filtered = parents.filter(p => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return p.matricule.toLowerCase().includes(s) || p.nom.toLowerCase().includes(s) || p.prenom.toLowerCase().includes(s) || p.service.toLowerCase().includes(s);
  });

  const toggleSelect = (matricule: string) => {
    setSelectedParents(prev => {
      const next = new Set(prev);
      if (next.has(matricule)) next.delete(matricule); else next.add(matricule);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedParents.size === filtered.length) setSelectedParents(new Set());
    else setSelectedParents(new Set(filtered.map(p => p.matricule)));
  };

  const handleSendResetEmails = () => {
    if (selectedParents.size === 0) {
      toast({ title: '⚠️ Aucun parent sélectionné', description: 'Veuillez cocher au moins un parent.' });
      return;
    }
    selectedParents.forEach(matricule => {
      updateParent(matricule, { mailEnvoye: true });
    });
    addHistorique({
      utilisateur: 'Super Admin',
      role: 'Admin',
      action: 'Envoi mail',
      details: `A envoyé ${selectedParents.size} e-mail(s) de réinitialisation de mot de passe`,
    });
    toast({
      title: '📧 E-mails envoyés',
      description: `${selectedParents.size} e-mail(s) de réinitialisation de mot de passe envoyé(s) avec succès.`,
    });
    setSelectedParents(new Set());
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parents</h1>
            <p className="text-muted-foreground mt-1">{parents.length} parent(s) enregistré(s)</p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par matricule, nom, service..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <Button onClick={handleSendResetEmails} disabled={selectedParents.size === 0} className="gap-2 rounded-lg bg-primary text-primary-foreground">
          <Mail className="w-4 h-4" />Envoyer mail ({selectedParents.size})
        </Button>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          <strong className="text-accent">ℹ️ Information :</strong> Cochez les parents puis cliquez sur « Envoyer mail » pour leur envoyer un e-mail de réinitialisation de mot de passe (première connexion). Le badge <strong>✉ Envoyé</strong> apparaîtra à côté des parents ayant déjà reçu un mail.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl shadow-card border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12"><Checkbox checked={selectedParents.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="font-semibold">Matricule</TableHead>
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Prénom</TableHead>
                <TableHead className="font-semibold">Service</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Téléphone</TableHead>
                <TableHead className="font-semibold">Mail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun parent trouvé</TableCell></TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p.matricule}>
                    <TableCell><Checkbox checked={selectedParents.has(p.matricule)} onCheckedChange={() => toggleSelect(p.matricule)} /></TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">{p.matricule}</TableCell>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell>{p.prenom}</TableCell>
                    <TableCell className="text-sm">{p.service}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.telephone || '—'}</TableCell>
                    <TableCell>
                      {p.mailEnvoye ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Envoyé
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
