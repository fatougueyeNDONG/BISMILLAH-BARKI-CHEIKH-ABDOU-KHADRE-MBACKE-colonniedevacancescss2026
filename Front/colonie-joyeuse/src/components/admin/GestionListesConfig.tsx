import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, List, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ImportExcel from './ImportExcel';

const CODE_OPTIONS = [
  { value: 'PRINCIPALE', label: 'PRINCIPALE' },
  { value: 'ATTENTE_N1', label: 'ATTENTE_N1' },
  { value: 'ATTENTE_N2', label: 'ATTENTE_N2' },
];

interface ListeConfig {
  id: string;
  code: string;
  nom: string;
  description: string;
}

const INITIAL_LISTES: ListeConfig[] = [];

export default function GestionListesConfig() {
  const [listes, setListes] = useState<ListeConfig[]>([...INITIAL_LISTES]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingListe, setEditingListe] = useState<ListeConfig | null>(null);
  const [form, setForm] = useState({ code: '', nom: '', description: '' });
  const [importOpen, setImportOpen] = useState(false);

  const handleImportListes = (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    const validCodes = CODE_OPTIONS.map(o => o.value);
    data.forEach((row, i) => {
      if (!row.code || !row.nom) { errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (code, nom)' }); return; }
      const code = row.code.toUpperCase().trim();
      if (!validCodes.includes(code)) { errors.push({ ligne: i + 2, message: `Code invalide "${row.code}" (${validCodes.join(', ')})` }); return; }
      if (listes.some(l => l.code === code)) { errors.push({ ligne: i + 2, message: `Code "${code}" déjà existant` }); return; }
      setListes(prev => [...prev, { id: `l_${Date.now()}_${i}`, code, nom: row.nom, description: row.description || '' }]);
      success++;
    });
    return { success, errors };
  };

  const usedCodes = listes.filter(l => l.id !== editingListe?.id).map(l => l.code);
  const availableCodes = CODE_OPTIONS.filter(o => !usedCodes.includes(o.value));

  const openAdd = () => {
    setEditingListe(null);
    setForm({ code: '', nom: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (liste: ListeConfig) => {
    setEditingListe(liste);
    setForm({ code: liste.code, nom: liste.nom, description: liste.description });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code || !form.nom.trim()) {
      toast.error('Le code et le nom sont obligatoires');
      return;
    }
    const isDuplicate = listes.some(l => l.code === form.code && l.id !== editingListe?.id);
    if (isDuplicate) {
      toast.error('Ce code de liste existe déjà, veuillez en choisir un autre');
      return;
    }
    if (editingListe) {
      setListes(prev => prev.map(l => l.id === editingListe.id ? { ...l, ...form } : l));
      toast.success('Liste modifiée avec succès');
    } else {
      setListes(prev => [...prev, { id: `l_${Date.now()}`, ...form }]);
      toast.success('Liste ajoutée avec succès');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setListes(prev => prev.filter(l => l.id !== id));
    toast.success('Liste supprimée');
  };

  // For edit, include current code in available options
  const selectableCodes = editingListe
    ? CODE_OPTIONS.filter(o => !usedCodes.includes(o.value) || o.value === editingListe.code)
    : availableCodes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Listes</h1>
          <p className="text-muted-foreground">Configurer les listes d'inscription</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />Import Excel
          </Button>
          <Button onClick={openAdd} disabled={availableCodes.length === 0}>
            <Plus className="w-4 h-4 mr-2" />Ajouter une liste
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><List className="w-5 h-5" />Listes configurées</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listes.map(liste => (
                <TableRow key={liste.id}>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded font-semibold">{liste.code}</code></TableCell>
                  <TableCell className="font-semibold">{liste.nom}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{liste.description || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(liste)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(liste.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {listes.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune liste configurée</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingListe ? 'Modifier la liste' : 'Ajouter une liste'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Select value={form.code} onValueChange={v => setForm(f => ({ ...f, code: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un code" /></SelectTrigger>
                <SelectContent>
                  {selectableCodes.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Liste principale" />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de la liste" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingListe ? 'Modifier' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportExcel
        open={importOpen}
        onOpenChange={setImportOpen}
        singleEntity
        entities={[{
          value: 'listes',
          config: { label: 'Listes', colonnes: ['code', 'nom', 'description'], description: 'Colonnes requises : code (PRINCIPALE, ATTENTE_N1, ATTENTE_N2), nom. Optionnelle : description.' },
          onImport: handleImportListes,
        }]}
      />
    </div>
  );
}
