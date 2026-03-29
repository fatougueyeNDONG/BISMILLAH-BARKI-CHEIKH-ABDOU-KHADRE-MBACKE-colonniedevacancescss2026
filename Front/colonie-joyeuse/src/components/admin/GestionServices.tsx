import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Briefcase, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ImportExcel from './ImportExcel';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';

interface ServiceRow {
  id: string;
  nom: string;
  description: string;
}

export default function GestionServices() {
  const { token } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState({ nom: '', description: '' });
  const [nomError, setNomError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadServices = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<Array<{ id: number; nom: string; description: string }>>('/admin/services', { token });
      setServices(data.map(s => ({ id: String(s.id), nom: s.nom, description: s.description || '' })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement des services impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [token]);

  const normalizedKey = (s: string) => s.trim().toLowerCase();

  const handleImport = async (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    if (!token) {
      return { success, errors: [{ ligne: 1, message: "Token d'authentification manquant." }] };
    }
    const seen = new Set(services.map(s => normalizedKey(s.nom)));
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.nom || !String(row.nom).trim()) {
        errors.push({ ligne: i + 2, message: 'Nom obligatoire' });
        continue;
      }
      const key = normalizedKey(String(row.nom));
      if (seen.has(key)) {
        errors.push({ ligne: i + 2, message: `Service « ${row.nom} » déjà présent ou doublon dans le fichier` });
        continue;
      }
      try {
        await apiRequest('/admin/services', {
          method: 'POST',
          token,
          body: JSON.stringify({
            nom: String(row.nom).trim(),
            description: row.description != null ? String(row.description) : null,
          }),
        });
        seen.add(key);
        success++;
      } catch (error) {
        errors.push({ ligne: i + 2, message: error instanceof Error ? error.message : 'Échec création' });
      }
    }
    await loadServices();
    return { success, errors };
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ nom: '', description: '' });
    setNomError('');
    setDialogOpen(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditing(s);
    setForm({ nom: s.nom, description: s.description });
    setNomError('');
    setDialogOpen(true);
  };

  const onNomChange = (value: string) => {
    setForm(f => ({ ...f, nom: value }));
    const key = normalizedKey(value);
    const dup = services.some(s => normalizedKey(s.nom) === key && s.id !== editing?.id);
    setNomError(dup ? 'Ce nom est déjà utilisé par un autre service' : '');
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.nom.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    if (nomError) {
      toast.error(nomError);
      return;
    }
    if (services.some(s => normalizedKey(s.nom) === normalizedKey(form.nom) && s.id !== editing?.id)) {
      toast.error('Ce nom est déjà utilisé');
      return;
    }
    try {
      if (editing) {
        await apiRequest(`/admin/services/${editing.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(form),
        });
        toast.success('Service modifié');
      } else {
        await apiRequest('/admin/services', { method: 'POST', token, body: JSON.stringify(form) });
        toast.success('Service ajouté');
      }
      await loadServices();
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Échec de sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await apiRequest(`/admin/services/${id}`, { method: 'DELETE', token });
      toast.success('Service supprimé');
      await loadServices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des services</h1>
          <p className="text-muted-foreground">Services CSS / directions (utilisés pour les parents et agents)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2 rounded-lg">
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </Button>
          <Button onClick={openAdd} className="rounded-lg gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un service
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="w-5 h-5 text-brand-orange" />
            Services configurés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold">{s.nom}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.description || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEdit(s)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive rounded-lg"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && services.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Aucun service configuré
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Chargement…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le service' : 'Ajouter un service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input value={form.nom} onChange={e => onNomChange(e.target.value)} placeholder="Ex: D.A.I.T, C.C.G.R" className="rounded-lg" />
              {nomError && <p className="text-destructive text-sm mt-1">{nomError}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optionnel"
                className="rounded-lg min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button className="rounded-lg" onClick={handleSave} disabled={!!nomError}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportExcel
        open={importOpen}
        onOpenChange={setImportOpen}
        singleEntity
        entities={[
          {
            value: 'services',
            config: {
              label: 'Services',
              colonnes: ['nom', 'description'],
              description: 'Colonne requise : nom. Optionnelle : description.',
            },
            onImport: handleImport,
          },
        ]}
      />
    </div>
  );
}
