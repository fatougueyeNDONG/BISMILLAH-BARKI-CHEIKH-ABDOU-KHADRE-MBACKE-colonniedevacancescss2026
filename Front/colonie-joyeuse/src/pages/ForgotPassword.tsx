import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Lock, KeyRound } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function ForgotPassword() {
  const { setAuthStep } = useAuth();
  const [matricule, setMatricule] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = () => {
    if (!matricule || !newPwd || !confirmPwd) {
      setErrorMessage('Veuillez remplir tous les champs.');
      setErrorOpen(true);
      return;
    }
    if (newPwd.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      setErrorOpen(true);
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      setErrorOpen(true);
      return;
    }
    setErrorMessage("Cette fonction n'est pas disponible dans le frontend. Contactez l'administration pour reinitialiser votre mot de passe.");
    setErrorOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-elevated p-8 space-y-6">
          <div className="text-center space-y-3">
            <img src={logo} alt="Logo CSS" className="w-16 h-16 mx-auto object-contain" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Mot de passe oublié</h2>
              <p className="text-sm text-muted-foreground mt-1">Saisissez votre matricule et définissez un nouveau mot de passe.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Matricule</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Ex: CSS-2024-001" value={matricule} onChange={e => setMatricule(e.target.value)} className="pl-10 h-12 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Minimum 6 caractères" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="pl-10 h-12 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" placeholder="Confirmez" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="pl-10 h-12 rounded-lg" />
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              className="w-full h-12 rounded-lg font-semibold border-0 !bg-[#0d2149] !text-white shadow-sm hover:!bg-[#142a5c] focus-visible:ring-[#0d2149]/40"
            >
              Définir le nouveau mot de passe
            </Button>
            <button onClick={() => setAuthStep('logged_out')} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Retour à la connexion
            </button>
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
    </div>
  );
}
