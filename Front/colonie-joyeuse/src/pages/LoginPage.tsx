import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useInscription } from '@/contexts/InscriptionContext';
import { apiRequest } from '@/lib/api';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Shield, Users, KeyRound, AlertTriangle, Lock, Eye, EyeOff, Info } from 'lucide-react';

type LoginMode = 'select' | 'parent' | 'admin';

export default function LoginPage() {
  const { loginAsParent, loginAsAdmin, setAuthStep } = useAuth();
  const { settings } = useInscription();
  const [mode, setMode] = useState<LoginMode>('select');
  const [matricule, setMatricule] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [showParentPwd, setShowParentPwd] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const hasDebut = Boolean(settings.dateDebutInscriptions);
  const hasFin = Boolean(settings.dateFinInscriptions);
  const inscriptionsClosed = !settings.inscriptionsOuvertes || (hasFin && today > settings.dateFinInscriptions);
  const inscriptionsNotStarted = hasDebut && today < settings.dateDebutInscriptions;

  const handleParentLogin = async () => {
    if (!settings.accesParentsActif) {
      setErrorTitle("Accès désactivé");
      setErrorMessage("L'accès à la plateforme parents est actuellement désactivé par l'administration. Veuillez réessayer ultérieurement.");
      setErrorOpen(true);
      return;
    }
    if (inscriptionsNotStarted) {
      setErrorTitle("Inscriptions pas encore ouvertes");
      setErrorMessage(`La période d'inscription pour la Colonie de Vacances 2026 n'a pas encore commencé. Les inscriptions ouvriront le ${new Date(settings.dateDebutInscriptions).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Veuillez patienter jusqu'à cette date.`);
      setErrorOpen(true);
      return;
    }

    const trimmed = matricule.trim();
    if (!trimmed || !parentPassword) {
      setErrorTitle("Champs requis");
      setErrorMessage("Veuillez saisir votre matricule et votre mot de passe.");
      setErrorOpen(true);
      return;
    }
    try {
      const tokenResponse = await apiRequest<{ access_token: string; must_change_password: boolean }>('/auth/login-parent', {
        method: 'POST',
        body: JSON.stringify({ matricule: trimmed, password: parentPassword }),
      });

      const me = await apiRequest<{
        role: 'parent';
        parent?: { prenom: string; nom: string; matricule: string; service: string | null };
      }>('/auth/me', { token: tokenResponse.access_token });

      const parentProfile = me.parent
        ? {
            prenom: me.parent.prenom || '',
            nom: me.parent.nom || '',
            matricule: me.parent.matricule || trimmed,
            service: me.parent.service || '',
          }
        : { prenom: '', nom: '', matricule: trimmed, service: '' };

      loginAsParent(parentProfile, tokenResponse.access_token, tokenResponse.must_change_password);
    } catch (error) {
      setErrorTitle("Erreur d'authentification");
      setErrorMessage(error instanceof Error ? error.message : "Les identifiants saisis sont incorrects.");
      setErrorOpen(true);
    }
  };

  const handleAdminLogin = async () => {
    if (!email || !password) {
      setErrorTitle("Champs requis");
      setErrorMessage("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      setErrorOpen(true);
      return;
    }
    try {
      const tokenResponse = await apiRequest<{ access_token: string; must_change_password: boolean }>('/auth/login-admin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const me = await apiRequest<{ role: string; email: string }>('/auth/me', {
        token: tokenResponse.access_token,
      });
      const normalizedRole = String(me.role || '').toLowerCase();
      if (normalizedRole !== 'gestionnaire' && normalizedRole !== 'super_admin') {
        throw new Error("Rôle administrateur invalide retourné par l'API.");
      }
      loginAsAdmin(me.email || email, normalizedRole, tokenResponse.access_token, tokenResponse.must_change_password);
    } catch (error) {
      setErrorTitle("Erreur d'authentification");
      setErrorMessage("Les identifiants saisis sont incorrects.");
      setErrorOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="w-full max-w-lg relative z-10">
            <div className="bg-card rounded-xl shadow-elevated p-8 space-y-8">
              <div className="text-center space-y-4">
                <motion.img src={logo} alt="Logo CSS" className="w-24 h-24 mx-auto object-contain" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }} />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Colonie de Vacances 2026</h1>
                  <p className="text-muted-foreground mt-1">Portail d'inscription en ligne — CSS</p>
                </div>
              </div>

              {inscriptionsNotStarted && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                  <Info className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-primary">Les inscriptions ne sont pas encore ouvertes</p>
                  <p className="text-xs text-muted-foreground mt-1">Les inscriptions ouvriront le {new Date(settings.dateDebutInscriptions).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                </div>
              )}

              {inscriptionsClosed && !inscriptionsNotStarted && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-destructive">⚠️ Les inscriptions sont actuellement fermées</p>
                  <p className="text-xs text-muted-foreground mt-1">La période d'inscription est terminée depuis le {new Date(settings.dateFinInscriptions).toLocaleDateString('fr-FR')}.</p>
                </div>
              )}

              <div className="space-y-3">
                <button onClick={() => setMode('parent')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-brand-navy transition-all duration-200 group">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground group-hover:text-white">Parent / Agent CSS</p>
                    <p className="text-sm text-muted-foreground group-hover:text-white/80">Accédez avec votre matricule et mot de passe</p>
                  </div>
                </button>

                <button onClick={() => setMode('admin')} className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-brand-navy transition-all duration-200 group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground group-hover:text-white">Administration</p>
                    <p className="text-sm text-muted-foreground group-hover:text-white/80">Gestionnaire & Super Administrateur</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'parent' && (
          <motion.div key="parent" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full max-w-md relative z-10">
            <div className="bg-card rounded-xl shadow-elevated p-8 space-y-6">
              <div className="text-center space-y-3">
                <img src={logo} alt="Logo CSS" className="w-16 h-16 mx-auto object-contain" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Espace Parent</h2>
                  <p className="text-sm text-muted-foreground">Saisissez votre matricule et mot de passe</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="matricule" className="text-foreground font-medium">Matricule</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="matricule" placeholder="Ex: CSS-2024-001" value={matricule} onChange={e => setMatricule(e.target.value)} className="pl-10 h-12 rounded-lg" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent-password" className="text-foreground font-medium">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="parent-password" type={showParentPwd ? 'text' : 'password'} placeholder="••••••••" value={parentPassword} onChange={e => setParentPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleParentLogin()} className="pl-10 pr-10 h-12 rounded-lg" />
                    <button type="button" onClick={() => setShowParentPwd(!showParentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showParentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button onClick={handleParentLogin} className="w-full h-12 rounded-lg bg-brand-navy text-primary-foreground hover:bg-brand-navy/90 font-semibold text-base">
                  Accéder à mon espace
                </Button>

                <button onClick={() => setAuthStep('forgot_password')} className="w-full text-sm text-brand-navy hover:text-brand-navy/80 transition-colors font-medium">
                  🔑 Mot de passe oublié ?
                </button>

                <button onClick={() => { setMode('select'); setMatricule(''); setParentPassword(''); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Retour
                </button>
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-primary">📌 Note :</strong> Veuillez entrer votre matricule et le mot de passe par défaut <strong>Passer123</strong>. Lors de votre première connexion, vous serez obligé de changer votre mot de passe puis de vous reconnecter pour accéder à votre espace parent.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full max-w-md relative z-10">
            <div className="bg-card rounded-xl shadow-elevated p-8 space-y-6">
              <div className="text-center space-y-3">
                <img src={logo} alt="Logo CSS" className="w-16 h-16 mx-auto object-contain" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">Administration</h2>
                  <p className="text-sm text-muted-foreground">Connectez-vous à votre espace de gestion</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">Adresse e-mail</Label>
                  <Input id="email" type="email" placeholder="admin@css.sn" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">Mot de passe</Label>
                  <div className="relative">
                    <Input id="password" type={showAdminPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} className="pr-10 h-12 rounded-lg" />
                    <button type="button" onClick={() => setShowAdminPwd(!showAdminPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showAdminPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleAdminLogin} className="w-full h-12 rounded-lg bg-brand-navy text-primary-foreground hover:bg-brand-navy/90 font-semibold text-base">
                  Se connecter
                </Button>
                <button onClick={() => { setMode('select'); setEmail(''); setPassword(''); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Retour
                </button>
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  Les identifiants saisis sont verifies en temps reel via le backend.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <DialogTitle className="text-foreground">{errorTitle}</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground pt-2">{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorOpen(false)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
