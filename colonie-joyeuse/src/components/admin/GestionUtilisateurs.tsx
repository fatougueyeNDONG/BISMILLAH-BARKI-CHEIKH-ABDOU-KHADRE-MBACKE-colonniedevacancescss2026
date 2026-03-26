import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AdminUser, Parent, MOCK_SITES } from '@/data/mockData';
import { useInscription } from '@/contexts/InscriptionContext';
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

export default function GestionUtilisateurs() {
  const { parents, addParent, updateParent, removeParent } = useInscription();
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newRole, setNewRole] = useState<'gestionnaire' | 'super_admin'>('gestionnaire');
  const [newPassword, setNewPassword] = useState('admin123');
  const [newTelephone, setNewTelephone] = useState('');

  // Parent creation
  const [createParentOpen, setCreateParentOpen] = useState(false);
  const [newParentMatricule, setNewParentMatricule] = useState('');
  const [newParentPrenom, setNewParentPrenom] = useState('');
  const [newParentNom, setNewParentNom] = useState('');
  const [newParentService, setNewParentService] = useState('');
  const [newParentPassword, setNewParentPassword] = useState('parent123');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentTelephone, setNewParentTelephone] = useState('');
  const [newParentSite, setNewParentSite] = useState('');

  // Edit parent
  const [editParentOpen, setEditParentOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);

  // Reset password
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdTarget, setResetPwdTarget] = useState<{ type: 'admin' | 'parent'; id: string; name: string } | null>(null);
  const [resetNewPwd, setResetNewPwd] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importExcelOpen, setImportExcelOpen] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  const fetchAdmins = async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    const mapped: AdminUser[] = data
      .filter((u: any) => u.role === 'GESTIONNAIRE' || u.role === 'SUPER_ADMIN')
      .map((u: any) => {
        const fullName = String(u.name || '').trim();
        const parts = fullName.split(/\s+/);
        const prenom = parts[0] || '';
        const nom = parts.slice(1).join(' ') || '';
        return {
          id: String(u.id),
          email: String(u.email || ''),
          nom,
          prenom,
          role: u.role === 'SUPER_ADMIN' ? 'super_admin' : 'gestionnaire',
          actif: Boolean(u.is_active),
          dateCreation: '',
          motDePasse: '',
        };
      });
    setAdmins(mapped);
  };

  useEffect(() => {
    void fetchAdmins();
  }, []);

  const handleImportParents = (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    data.forEach((row, i) => {
      if (!row.matricule || !row.prenom || !row.nom || !row.service) {
        errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (matricule, prenom, nom, service)' });
        return;
      }
      if (parents.some(p => p.matricule === row.matricule)) {
        errors.push({ ligne: i + 2, message: `Matricule "${row.matricule}" déjà existant` });
        return;
      }
      addParent({ matricule: row.matricule, prenom: row.prenom, nom: row.nom, service: row.service, site: row.site || undefined, email: row.email || undefined, telephone: row.telephone || undefined, motDePasse: 'parent123', premiereConnexion: true });
      success++;
    });
    return { success, errors };
  };

  const handleImportAdmins = async (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    const token = getToken();
    if (!token) {
      return { success: 0, errors: [{ ligne: 1, message: 'Session expirée. Reconnectez-vous.' }] };
    }
    for (let i = 0; i < data.length; i += 1) {
      const row = data[i];
      if (!row.email || !row.prenom || !row.nom || !row.role) {
        errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (email, prenom, nom, role)' });
        continue;
      }
      const role = row.role.toLowerCase().trim();
      if (role !== 'gestionnaire' && role !== 'super_admin') {
        errors.push({ ligne: i + 2, message: `Rôle invalide "${row.role}" (gestionnaire ou super_admin)` });
        continue;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: role === 'super_admin' ? 'SUPER_ADMIN' : 'GESTIONNAIRE',
            name: `${row.prenom} ${row.nom}`.trim(),
            email: row.email,
            password: 'admin12345',
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          errors.push({ ligne: i + 2, message: payload?.detail || 'Erreur backend' });
          continue;
        }
        success++;
      } catch {
        errors.push({ ligne: i + 2, message: 'Impossible de joindre le backend' });
      }
    }
    await fetchAdmins();
    return { success, errors };
  };


  const handleCreate = async () => {
    if (!newEmail || !newNom || !newPrenom) return;
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role: newRole === 'super_admin' ? 'SUPER_ADMIN' : 'GESTIONNAIRE',
        name: `${newPrenom} ${newNom}`.trim(),
        email: newEmail,
        password: newPassword || 'admin12345',
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast({ title: "Erreur de création", description: data?.detail || 'Impossible de créer', variant: 'destructive' });
      return;
    }
    await fetchAdmins();
    setCreateOpen(false);
    setNewEmail(''); setNewNom(''); setNewPrenom(''); setNewPassword('admin123'); setNewTelephone('');
    toast({ title: '✅ Administrateur créé' });
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}/deactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast({ title: "Erreur de suppression", description: data?.detail || 'Impossible de désactiver', variant: 'destructive' });
      return;
    }
    await fetchAdmins();
    toast({ title: '🗑️ Utilisateur désactivé', variant: 'destructive' });
  };

  const handleToggleActif = async (id: string) => {
    const token = getToken();
    if (!token) return;
    const current = admins.find((a) => a.id === id);
    if (!current) return;
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: !current.actif }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast({ title: 'Erreur', description: data?.detail || 'Impossible de modifier le statut', variant: 'destructive' });
      return;
    }
    await fetchAdmins();
    toast({ title: !current.actif ? '✅ Activé' : '⚠️ Désactivé' });
  };

  const openEdit = (admin: AdminUser) => { setEditingAdmin({ ...admin }); setEditOpen(true); };

  const handleEdit = async () => {
    if (!editingAdmin) return;
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/users/${editingAdmin.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `${editingAdmin.prenom} ${editingAdmin.nom}`.trim(),
        email: editingAdmin.email,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast({ title: 'Erreur', description: data?.detail || 'Impossible de modifier', variant: 'destructive' });
      return;
    }
    await fetchAdmins();
    setEditOpen(false);
    toast({ title: '✅ Modifié' });
  };

  const handleCreateParent = () => {
    if (!newParentMatricule || !newParentPrenom || !newParentNom || !newParentService) return;
    addParent({ matricule: newParentMatricule, prenom: newParentPrenom, nom: newParentNom, service: newParentService, site: newParentSite || undefined, motDePasse: newParentPassword, email: newParentEmail, telephone: newParentTelephone, premiereConnexion: true });
    setCreateParentOpen(false);
    setNewParentMatricule(''); setNewParentPrenom(''); setNewParentNom(''); setNewParentService(''); setNewParentPassword('parent123'); setNewParentEmail(''); setNewParentTelephone(''); setNewParentSite('');
    toast({ title: '✅ Parent créé' });
  };

  const handleEditParent = () => {
    if (!editingParent) return;
    updateParent(editingParent.matricule, editingParent);
    setEditParentOpen(false);
    toast({ title: '✅ Parent modifié' });
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').slice(1);
      let count = 0;
      lines.forEach(line => {
        const [matricule, prenom, nom, service] = line.split(',').map(s => s.trim());
        if (matricule && prenom && nom && service) {
          addParent({ matricule, prenom, nom, service, motDePasse: 'parent123' });
          count++;
        }
      });
      toast({ title: `✅ ${count} parent(s) importé(s)` });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetPassword = () => {
    if (!resetPwdTarget || !resetNewPwd) return;
    if (resetPwdTarget.type === 'admin') {
      const token = getToken();
      if (!token) return;
      void (async () => {
        const response = await fetch(`${API_BASE_URL}/admin/users/${resetPwdTarget.id}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ new_password: resetNewPwd }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          toast({ title: 'Erreur', description: data?.detail || 'Impossible de réinitialiser', variant: 'destructive' });
          return;
        }
        setResetPwdOpen(false);
        setResetNewPwd('');
        toast({ title: '✅ Mot de passe réinitialisé' });
      })();
      return;
    } else {
      updateParent(resetPwdTarget.id, { motDePasse: resetNewPwd });
    }
    setResetPwdOpen(false);
    setResetNewPwd('');
    toast({ title: '✅ Mot de passe réinitialisé' });
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
                        <Button size="sm" variant="ghost" onClick={() => { setResetPwdTarget({ type: 'parent', id: p.matricule, name: `${p.prenom} ${p.nom}` }); setResetPwdOpen(true); }} className="h-8 w-8 p-0"><KeyRound className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { removeParent(p.matricule); toast({ title: '🗑️ Parent supprimé', variant: 'destructive' }); }} className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-accent">📄 Format CSV :</strong> matricule, prenom, nom, service (une ligne par parent, avec en-tête).
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
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={newParentSite} onValueChange={setNewParentSite}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Sélectionner un site" /></SelectTrigger>
                <SelectContent>
                  {MOCK_SITES.map(s => (
                    <SelectItem key={s.id} value={s.code}>{s.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={editingParent.site || ''} onValueChange={v => setEditingParent({ ...editingParent, site: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Sélectionner un site" /></SelectTrigger>
                  <SelectContent>
                    {MOCK_SITES.map(s => (
                      <SelectItem key={s.id} value={s.code}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          { value: 'parents', config: { label: 'Parents / Agents CSS', colonnes: ['matricule', 'prenom', 'nom', 'service', 'site', 'email', 'telephone'], description: 'Colonnes requises : matricule, prenom, nom, service. Optionnelles : site, email, telephone.' }, onImport: handleImportParents },
          { value: 'admins', config: { label: 'Administrateurs', colonnes: ['email', 'prenom', 'nom', 'role', 'telephone'], description: 'Colonnes requises : email, prenom, nom, role (gestionnaire ou super_admin). Optionnelle : telephone.' }, onImport: handleImportAdmins },
        ]}
      />
    </div>
  );
}
