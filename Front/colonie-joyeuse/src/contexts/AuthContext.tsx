import React, { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'parent' | 'gestionnaire' | 'super_admin' | null;
type AuthStep = 'logged_out' | 'force_password_change' | 'forgot_password' | 'logged_in';
type AdminRole = 'gestionnaire' | 'super_admin';

export interface ParentProfile {
  prenom: string;
  nom: string;
  matricule: string;
  service: string;
}

export interface PendingAdminFirstLogin {
  email: string;
  role: AdminRole;
}

interface AuthContextType {
  role: UserRole;
  parent: ParentProfile | null;
  adminEmail: string | null;
  authStep: AuthStep;
  token: string | null;
  loginAsParent: (parent: ParentProfile, token: string, mustChangePassword?: boolean) => void;
  loginAsAdmin: (email: string, role: AdminRole, token: string, mustChangePassword?: boolean) => void;
  logout: () => void;
  setAuthStep: (step: AuthStep) => void;
  pendingParent: ParentProfile | null;
  setPendingParent: (p: ParentProfile | null) => void;
  pendingAdminFirstLogin: PendingAdminFirstLogin | null;
  setPendingAdminFirstLogin: (p: PendingAdminFirstLogin | null) => void;
  /** Après changement de mot de passe obligatoire (admin), ouvre la session sans nouvelle connexion. */
  finalizeAdminFirstLogin: (email: string, role: AdminRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('logged_out');
  const [pendingParent, setPendingParent] = useState<ParentProfile | null>(null);
  const [pendingAdminFirstLogin, setPendingAdminFirstLogin] = useState<PendingAdminFirstLogin | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const loginAsParent = (p: ParentProfile, accessToken: string, mustChangePassword = false) => {
    setToken(accessToken);
    setPendingAdminFirstLogin(null);
    if (mustChangePassword) {
      setPendingParent(p);
      setAuthStep('force_password_change');
      return;
    }
    setRole('parent');
    setParent(p);
    setAdminEmail(null);
    setAuthStep('logged_in');
  };

  const loginAsAdmin = (email: string, r: AdminRole, accessToken: string, mustChangePassword = false) => {
    setToken(accessToken);
    setParent(null);
    setPendingParent(null);
    if (mustChangePassword) {
      setPendingAdminFirstLogin({ email, role: r });
      setRole(null);
      setAdminEmail(null);
      setAuthStep('force_password_change');
      return;
    }
    setPendingAdminFirstLogin(null);
    setRole(r);
    setAdminEmail(email);
    setAuthStep('logged_in');
  };

  const logout = () => {
    setRole(null);
    setParent(null);
    setAdminEmail(null);
    setAuthStep('logged_out');
    setPendingParent(null);
    setPendingAdminFirstLogin(null);
    setToken(null);
  };

  const finalizeAdminFirstLogin = (email: string, r: AdminRole) => {
    setPendingAdminFirstLogin(null);
    setRole(r);
    setAdminEmail(email);
    setAuthStep('logged_in');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        parent,
        adminEmail,
        authStep,
        token,
        loginAsParent,
        loginAsAdmin,
        logout,
        setAuthStep,
        pendingParent,
        setPendingParent,
        pendingAdminFirstLogin,
        setPendingAdminFirstLogin,
        finalizeAdminFirstLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
