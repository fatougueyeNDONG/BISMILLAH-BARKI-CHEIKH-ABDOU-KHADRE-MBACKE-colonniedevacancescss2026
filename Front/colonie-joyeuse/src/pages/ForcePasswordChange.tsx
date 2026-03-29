import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function ForcePasswordChange() {
  const {
    pendingParent,
    pendingAdminFirstLogin,
    token,
    logout,
    finalizeAdminFirstLogin,
  } = useAuth();
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);

  const isAdminFlow = Boolean(pendingAdminFirstLogin);
  const isParentFlow = Boolean(pendingParent);

  const handleSubmit = async () => {
    if (!newPwd || !confirmPwd) {
      setErrorMessage('Veuillez remplir tous les champs.');
      setErrorOpen(true);
      return;
    }
    if (newPwd.length < 8) {
      setErrorMessage('Le mot de passe doit contenir au moins 8 caractères.');
      setErrorOpen(true);
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      setErrorOpen(true);
      return;
    }
    if (!token) {
      setErrorMessage('Session invalide. Veuillez vous reconnecter.');
      setErrorOpen(true);
      return;
    }
    try {
      if (isParentFlow) {
        await apiRequest<{ ok: boolean }>('/auth/change-password', {
          method: 'POST',
          token,
          body: JSON.stringify({ old_password: 'Passer123', new_password: newPwd }),
        });
      } else if (isAdminFlow) {
        await apiRequest<{ ok: boolean }>('/auth/change-password-first-login', {
          method: 'POST',
          token,
          body: JSON.stringify({ new_password: newPwd }),
        });
      } else {
        setErrorMessage('Session invalide. Veuillez vous reconnecter.');
        setErrorOpen(true);
        return;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de modifier le mot de passe.');
      setErrorOpen(true);
      return;
    }
    setSuccessOpen(true);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    if (pendingAdminFirstLogin) {
      finalizeAdminFirstLogin(pendingAdminFirstLogin.email, pendingAdminFirstLogin.role);
      return;
    }
    logout();
  };

  if (!isParentFlow && !isAdminFlow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-elevated p-8 max-w-md text-center space-y-4">
          <p className="text-muted-foreground">Session invalide ou expirée.</p>
          <Button onClick={() => logout()} className="rounded-lg">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-elevated p-8 space-y-6">
          <div className="text-center space-y-3">
            <img src={logo} alt="Logo CSS" className="w-16 h-16 mx-auto object-contain" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Changement de mot de passe obligatoire</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isParentFlow ? (
                  <>
                    Bienvenue <strong>{pendingParent?.prenom} {pendingParent?.nom}</strong> ! Pour des raisons de sécurité, veuillez définir votre propre mot de passe.
                  </>
                ) : (
                  <>
                    Compte <strong>{pendingAdminFirstLogin?.role === 'super_admin' ? 'super administrateur' : 'gestionnaire'}</strong> — définissez un mot de passe personnel avant d’accéder à l’espace d’administration.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Première connexion :</strong>{' '}
              {isParentFlow
                ? 'Le mot de passe par défaut était temporaire. Choisissez un mot de passe sécurisé.'
                : 'Le mot de passe reçu par e-mail était temporaire. Choisissez un mot de passe sécurisé.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Minimum 8 caracteres" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="pl-10 h-12 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Confirmer votre mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Confirmez le mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="pl-10 h-12 rounded-lg" />
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full h-12 rounded-lg bg-brand-navy text-primary-foreground hover:bg-brand-navy/90 font-semibold">
              Définir mon mot de passe
            </Button>
          </div>
        </div>
      </motion.div>

      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
              <DialogTitle className="text-foreground">Erreur</DialogTitle>
            </div>
            <DialogDescription className="pt-2">{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setErrorOpen(false)} className="bg-primary text-primary-foreground rounded-lg">Compris</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={(open) => { if (!open) handleSuccessClose(); }}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
              <DialogTitle className="text-foreground">Mot de passe défini avec succès</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {isAdminFlow
                ? 'Votre nouveau mot de passe est enregistré. Vous pouvez accéder à l’espace d’administration.'
                : 'Votre nouveau mot de passe a été enregistré. Vous allez être redirigé vers la page de connexion pour vous connecter avec vos nouveaux identifiants.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={handleSuccessClose} className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg">{isAdminFlow ? 'Accéder à l’espace' : 'Retour à la connexion'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
