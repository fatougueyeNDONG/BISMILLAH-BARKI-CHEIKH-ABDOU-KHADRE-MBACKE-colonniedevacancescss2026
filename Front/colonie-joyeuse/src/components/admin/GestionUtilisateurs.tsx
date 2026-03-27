import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UserPlus, Pencil, Trash2, Shield, Users, Upload, KeyRound, FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import ImportExcel from './ImportExcel';
import { apiRequest } from '@/lib/api';

interface ApiUser {
  id: number;
  name: string;
  role: string;
  is_active: boolean;
  email?: string | null;
  matricule?: string | null;
  parent_prenom?: string | null;
  parent_nom?: string | null;
  parent_service?: string | null;
  parent_site_code?: string | null;
  parent_telephone?: string | null;
}

interface AdminUserUI {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: 'gestionnaire' | 'super_admin';
  actif: boolean;
  telephone?: string;
}

interface ParentUserUI {
  id: number;
  matricule: string;
  prenom: string;
  nom: string;
  service: string;
  email?: string;
  site?: string;
  telephone?: string;
}

export default function GestionUtilisateurs() {
  const { token } = useAuth();
  const [rawUsers, setRawUsers] = useState<ApiUser[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserUI | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newRole, setNewRole] = useState<'gestionnaire' | 'super_admin'>('gestionnaire');
  const [newPassword, setNewPassword] = useState('');
  const [newTelephone, setNewTelephone] = useState('');

  // Parent creation
  const [createParentOpen, setCreateParentOpen] = useState(false);
  const [newParentMatricule, setNewParentMatricule] = useState('');
  const [newParentPrenom, setNewParentPrenom] = useState('');
  const [newParentNom, setNewParentNom] = useState('');
  const [newParentService, setNewParentService] = useState('');
  const [newParentPassword, setNewParentPassword] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentTelephone, setNewParentTelephone] = useState('');
  const [newParentSite, setNewParentSite] = useState('');

  // Edit parent
  const [editParentOpen, setEditParentOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentUserUI | null>(null);

  // Reset password
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdTarget, setResetPwdTarget] = useState<{ type: 'admin' | 'parent'; id: number; name: string } | null>(null);
  const [resetNewPwd, setResetNewPwd] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const admins: AdminUserUI[] = rawUsers
    .filter(u => ['GESTIONNAIRE', 'SUPER_ADMIN'].includes(String(u.role).toUpperCase()))
    .map(u => {
      const [prenom = '', ...rest] = String(u.name || '').trim().split(' ');
      return {
        id: u.id,
        email: u.email || '',
        prenom,
        nom: rest.join(' ') || String(u.name || ''),
        role: String(u.role).toUpperCase() === 'SUPER_ADMIN' ? 'super_admin' : 'gestionnaire',
        actif: !!u.is_active,
        telephone: '',
      };
    });

  const parents: ParentUserUI[] = rawUsers
    .filter(u => String(u.role).toUpperCase() === 'PARENT')
    .map(u => ({
      id: u.id,
      matricule: u.matricule || '',
      prenom: u.parent_prenom || '',
      nom: u.parent_nom || '',
      service: u.parent_service || '',
      email: u.email || undefined,
      site: u.parent_site_code || undefined,
      telephone: u.parent_telephone || undefined,
    }));

  const loadUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiRequest<ApiUser[]>('/admin/users', { token });
      setRawUsers(data);
    } catch (error) {
      toast({ title: "Erreur de chargement", description: error instanceof Error ? error.message : 'API indisponible', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const handleImportParents = async (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    if (!token) {
      return { success, errors: [{ ligne: 1, message: "Token d'authentification manquant." }] };
    }
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.matricule || !row.prenom || !row.nom || !row.service) {
        errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (matricule, prenom, nom, service, password)' });
        continue;
      }
      if (!row.password || String(row.password).length < 8) {
        errors.push({ ligne: i + 2, message: 'Le mot de passe est obligatoire (min 8 caractères).' });
        continue;
      }
      if (parents.some(p => p.matricule === row.matricule)) {
        errors.push({ ligne: i + 2, message: `Matricule "${row.matricule}" déjà existant` });
        continue;
      }
      try {
        await apiRequest('/admin/users', {
          method: 'POST',
          token,
          body: JSON.stringify({
            role: 'PARENT',
            name: `${row.prenom} ${row.nom}`.trim(),
            email: row.email || null,
            matricule: row.matricule,
            prenom: row.prenom,
            nom: row.nom,
            service: row.service,
            site_code: row.site || null,
            password: row.password,
          }),
        });
        success++;
      } catch (error) {
        errors.push({ ligne: i + 2, message: error instanceof Error ? error.message : "Échec de création du parent" });
      }
    }
    await loadUsers();
    return { success, errors };
  };

  const handleImportAdmins = async (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    if (!token) {
      return { success, errors: [{ ligne: 1, message: "Token d'authentification manquant." }] };
    }
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row.email || !row.prenom || !row.nom || !row.role) {
        errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (email, prenom, nom, role)' });
        continue;
      }
      const role = String(row.role).toLowerCase().trim();
      if (role !== 'gestionnaire' && role !== 'super_admin') {
        errors.push({ ligne: i + 2, message: `Rôle invalide "${row.role}" (gestionnaire ou super_admin)` });
        continue;
      }
      if (admins.some(a => a.email === row.email)) {
        errors.push({ ligne: i + 2, message: `Email "${row.email}" déjà existant` });
        continue;
      }
      try {
        await apiRequest('/admin/users', {
          method: 'POST',
          token,
          body: JSON.stringify({
            role: role.toUpperCase(),
            name: `${row.prenom} ${row.nom}`.trim(),
            email: row.email,
          }),
        });
        success++;
      } catch (error) {
        errors.push({ ligne: i + 2, message: error instanceof Error ? error.message : "Échec de création de l'admin" });
      }
    }
    await loadUsers();
    return { success, errors };
  };


  const handleCreate = async () => {
    if (!token) return;
    if (!newEmail || !newNom || !newPrenom) return;
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          role: newRole.toUpperCase(),
          name: `${newPrenom} ${newNom}`.trim(),
          email: newEmail,
        }),
      });
      setCreateOpen(false);
      setNewEmail(''); setNewNom(''); setNewPrenom(''); setNewPassword(''); setNewTelephone('');
      await loadUsers();
      toast({ title: '✅ Administrateur créé' });
    } catch (error) {
      toast({ title: "Échec création admin", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE', token });
      await loadUsers();
      toast({ title: '🗑️ Utilisateur supprimé', variant: 'destructive' });
    } catch (error) {
      toast({ title: "Suppression impossible", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
    }
  };

  const handleToggleActif = async (id: number) => {
    if (!token) return;
    const user = rawUsers.find(u => u.id === id);
    if (!user) return;
    try {
      await apiRequest(`/admin/users/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      await loadUsers();
      toast({ title: !user.is_active ? '✅ Activé' : '⚠️ Désactivé' });
    } catch (error) {
      toast({ title: "Changement de statut impossible", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
    }
  };

  const openEdit = (admin: AdminUserUI) => { setEditingAdmin({ ...admin }); setEditOpen(true); };

  const handleEdit = async () => {
    if (!token) return;
    if (!editingAdmin) return;
    try {
      await apiRequest(`/admin/users/${editingAdmin.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: `${editingAdmin.prenom} ${editingAdmin.nom}`.trim(),
          email: editingAdmin.email,
          role: editingAdmin.role.toUpperCase(),
          is_active: editingAdmin.actif,
        }),
      });
      setEditOpen(false);
      await loadUsers();
      toast({ title: '✅ Modifié' });
    } catch (error) {
      toast({ title: "Modification impossible", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
    }
  };

  const handleCreateParent = async () => {
    if (!token) return;
    if (!newParentMatricule || !newParentPrenom || !newParentNom || !newParentService) return;
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          role: 'PARENT',
          name: `${newParentPrenom} ${newParentNom}`.trim(),
          email: newParentEmail || null,
          matricule: newParentMatricule,
          prenom: newParentPrenom,
          nom: newParentNom,
          service: newParentService,
          site_code: newParentSite || null,
          password: newParentPassword,
        }),
      });
      setCreateParentOpen(false);
      setNewParentMatricule(''); setNewParentPrenom(''); setNewParentNom(''); setNewParentService(''); setNewParentPassword(''); setNewParentEmail(''); setNewParentTelephone(''); setNewParentSite('');
      await loadUsers();
      toast({ title: '✅ Parent créé' });
    } catch (error) {
      toast({ title: "Échec création parent", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
    }
  };

  const handleEditParent = async () => {
    if (!token || !editingParent) return;
    try {
      await apiRequest(`/admin/users/${editingParent.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          email: editingParent.email || null,
          parent_prenom: editingParent.prenom,
          parent_nom: editingParent.nom,
          parent_service: editingParent.service,
          parent_site_code: editingParent.site || null,
          parent_telephone: editingParent.telephone || null,
        }),
      });
      await loadUsers();
      toast({ title: '✅ Parent modifié' });
      setEditParentOpen(false);
    } catch (error) {
      toast({ title: "Modification impossible", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!token) {
      toast({ title: 'Import impossible', description: "Token d'authentification manquant.", variant: 'destructive' });
      return;
    }
    const text = await file.text();
    const lines = text.split('\n').slice(1);
    let count = 0;
    let errors = 0;
    for (const line of lines) {
      const [matricule, prenom, nom, service, email, site_code, password] = line.split(',').map(s => s.trim());
      if (!matricule || !prenom || !nom || !service || !password || password.length < 8) {
        errors++;
        continue;
      }
      try {
        await apiRequest('/admin/users', {
          method: 'POST',
          token,
          body: JSON.stringify({
            role: 'PARENT',
            name: `${prenom} ${nom}`.trim(),
            email: email || null,
            matricule,
            prenom,
            nom,
            service,
            site_code: site_code || null,
            password,
          }),
        });
        count++;
      } catch {
        errors++;
      }
    }
    await loadUsers();
    toast({ title: `✅ ${count} parent(s) importé(s)`, description: errors > 0 ? `${errors} ligne(s) en erreur.` : undefined, variant: errors > 0 ? 'destructive' : 'default' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetPassword = async () => {
    if (!token) return;
    if (!resetPwdTarget || !resetNewPwd) return;
    try {
      await apiRequest(`/admin/users/${resetPwdTarget.id}/reset-password`, {
        method: 'POST',
        token,
        body: JSON.stringify({ new_password: resetNewPwd }),
      });
      await loadUsers();
      toast({ title: '✅ Mot de passe réinitialisé' });
    } catch (error) {
      toast({ title: "Réinitialisation impossible", description: error instanceof Error ? error.message : 'Erreur API', variant: 'destructive' });
      return;
    }
    setResetPwdOpen(false);
    setResetNewPwd('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">Gérez les administrateurs et les agents CSS</p>
        </div>
        <Button onClick={() => setImportExcelOpen(true)} variant="outline" className="gap-2 rounded-lg">
          <FileSpreadsheet className="w-4 h-4" />Import Excel
        </Button>
      </motion.div>

      <Tabs defaultValue="admins">
        <TabsList className="rounded-lg">
          <TabsTrigger value="admins" className="gap-2 rounded-lg"><Shield className="w-4 h-4" />Administrateurs</TabsTrigger>
          <TabsTrigger value="parents" className="gap-2 rounded-lg"><Users className="w-4 h-4" />Agents CSS / Parents</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-lg bg-primary text-primary-foreground">
              <UserPlus className="w-4 h-4" />Nouvel administrateur
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Prénom</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Rôle</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nom}</TableCell>
                    <TableCell>{a.prenom}</TableCell>
                    <TableCell className="text-sm">{a.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${a.role === 'super_admin' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {a.role === 'super_admin' ? 'Super Admin' : 'Gestionnaire'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={a.actif} onCheckedChange={() => handleToggleActif(a.id)} className="data-[state=checked]:bg-emerald-500" />
                        <span className={`text-xs font-medium ${a.actif ? 'text-emerald-600' : 'text-muted-foreground'}`}>{a.actif ? 'Actif' : 'Inactif'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(a)} className="h-8 w-8 p-0"><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setResetPwdTarget({ type: 'admin', id: a.id, name: `${a.prenom} ${a.nom}` }); setResetPwdOpen(true); }} className="h-8 w-8 p-0"><KeyRound className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="parents" className="mt-6 space-y-4">
          <div className="flex justify-end gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 rounded-lg">
              <Upload className="w-4 h-4" />Importer CSV
            </Button>
            <Button onClick={() => setCreateParentOpen(true)} className="gap-2 rounded-lg bg-primary text-primary-foreground">
              <UserPlus className="w-4 h-4" />Nouveau parent
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Matricule</TableHead>
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Prénom</TableHead>
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map(p => (
                  <TableRow key={p.matricule}>
                    <TableCell className="font-mono tabular-nums text-sm">{p.matricule}</TableCell>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell>{p.prenom}</TableCell>
                    <TableCell className="text-sm">{p.service}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingParent({ ...p }); setEditParentOpen(true); }} className="h-8 w-8 p-0"><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setResetPwdTarget({ type: 'parent', id: p.id, name: `${p.prenom} ${p.nom}` }); setResetPwdOpen(true); }} className="h-8 w-8 p-0"><KeyRound className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { handleDelete(p.id); }} className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-accent">📄 Format CSV :</strong> matricule, prenom, nom, service, email, site_code, password (mot de passe min 8 caractères).
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Admin */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader><DialogTitle>Nouvel administrateur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prénom</Label><Input value={newPrenom} onChange={e => setNewPrenom(e.target.value)} className="rounded-lg" /></div>
              <div className="space-y-2"><Label>Nom</Label><Input value={newNom} onChange={e => setNewNom(e.target.value)} className="rounded-lg" /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="rounded-lg" /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={newTelephone} onChange={e => setNewTelephone(e.target.value)} placeholder="77 123 45 67" className="rounded-lg" /></div>
            <div className="space-y-2"><Label>Mot de passe</Label><Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" className="rounded-lg" /></div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                  <SelectItem value="super_admin">Super Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleCreate} className="rounded-lg bg-primary text-primary-foreground">Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader><DialogTitle>Modifier l'administrateur</DialogTitle></DialogHeader>
          {editingAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prénom</Label><Input value={editingAdmin.prenom} onChange={e => setEditingAdmin({ ...editingAdmin, prenom: e.target.value })} className="rounded-lg" /></div>
                <div className="space-y-2"><Label>Nom</Label><Input value={editingAdmin.nom} onChange={e => setEditingAdmin({ ...editingAdmin, nom: e.target.value })} className="rounded-lg" /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input value={editingAdmin.email} onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })} className="rounded-lg" /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input value={editingAdmin.telephone || ''} onChange={e => setEditingAdmin({ ...editingAdmin, telephone: e.target.value })} className="rounded-lg" /></div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={editingAdmin.role} onValueChange={(v: any) => setEditingAdmin({ ...editingAdmin, role: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                    <SelectItem value="super_admin">Super Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleEdit} className="rounded-lg bg-primary text-primary-foreground">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Parent */}
      <Dialog open={createParentOpen} onOpenChange={setCreateParentOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader><DialogTitle>Nouveau parent / Agent CSS</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Matricule</Label><Input value={newParentMatricule} onChange={e => setNewParentMatricule(e.target.value)} placeholder="CSS-2024-XXX" className="rounded-lg" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prénom</Label><Input value={newParentPrenom} onChange={e => setNewParentPrenom(e.target.value)} className="rounded-lg" /></div>
              <div className="space-y-2"><Label>Nom</Label><Input value={newParentNom} onChange={e => setNewParentNom(e.target.value)} className="rounded-lg" /></div>
            </div>
            <div className="space-y-2"><Label>Service</Label><Input value={newParentService} onChange={e => setNewParentService(e.target.value)} className="rounded-lg" /></div>
            <div className="space-y-2"><Label>Site</Label><Input value={newParentSite} onChange={e => setNewParentSite(e.target.value)} placeholder="Code du site (ex: VDN)" className="rounded-lg" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input value={newParentEmail} onChange={e => setNewParentEmail(e.target.value)} type="email" className="rounded-lg" /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input value={newParentTelephone} onChange={e => setNewParentTelephone(e.target.value)} className="rounded-lg" /></div>
            </div>
            <div className="space-y-2"><Label>Mot de passe</Label><Input value={newParentPassword} onChange={e => setNewParentPassword(e.target.value)} type="password" className="rounded-lg" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateParentOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleCreateParent} className="rounded-lg bg-primary text-primary-foreground">Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Parent */}
      <Dialog open={editParentOpen} onOpenChange={setEditParentOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader><DialogTitle>Modifier le parent</DialogTitle></DialogHeader>
          {editingParent && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Matricule</Label><Input value={editingParent.matricule} disabled className="rounded-lg bg-muted/50" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prénom</Label><Input value={editingParent.prenom} onChange={e => setEditingParent({ ...editingParent, prenom: e.target.value })} className="rounded-lg" /></div>
                <div className="space-y-2"><Label>Nom</Label><Input value={editingParent.nom} onChange={e => setEditingParent({ ...editingParent, nom: e.target.value })} className="rounded-lg" /></div>
              </div>
              <div className="space-y-2"><Label>Service</Label><Input value={editingParent.service} onChange={e => setEditingParent({ ...editingParent, service: e.target.value })} className="rounded-lg" /></div>
              <div className="space-y-2"><Label>Site</Label><Input value={editingParent.site || ''} onChange={e => setEditingParent({ ...editingParent, site: e.target.value })} placeholder="Code du site (ex: VDN)" className="rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input value={editingParent.email || ''} onChange={e => setEditingParent({ ...editingParent, email: e.target.value })} className="rounded-lg" /></div>
                <div className="space-y-2"><Label>Téléphone</Label><Input value={editingParent.telephone || ''} onChange={e => setEditingParent({ ...editingParent, telephone: e.target.value })} className="rounded-lg" /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditParentOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleEditParent} className="rounded-lg bg-primary text-primary-foreground">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Nouveau mot de passe pour <strong>{resetPwdTarget?.name}</strong></p>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={resetNewPwd} onChange={e => setResetNewPwd(e.target.value)} className="rounded-lg" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPwdOpen(false)} className="rounded-lg">Annuler</Button>
            <Button onClick={handleResetPassword} className="rounded-lg bg-primary text-primary-foreground">Réinitialiser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportExcel
        open={importExcelOpen}
        onOpenChange={setImportExcelOpen}
        entities={[
          { value: 'parents', config: { label: 'Parents / Agents CSS', colonnes: ['matricule', 'prenom', 'nom', 'service', 'site', 'email', 'password'], description: 'Colonnes requises : matricule, prenom, nom, service, password. Optionnelles : site, email.' }, onImport: handleImportParents },
          { value: 'admins', config: { label: 'Administrateurs', colonnes: ['email', 'prenom', 'nom', 'role', 'telephone'], description: 'Colonnes requises : email, prenom, nom, role (gestionnaire ou super_admin). Optionnelle : telephone.' }, onImport: handleImportAdmins },
        ]}
      />
    </div>
  );
}
