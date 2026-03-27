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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('logged_out');
  const [pendingParent, setPendingParent] = useState<ParentProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const loginAsParent = (p: ParentProfile, accessToken: string, mustChangePassword = false) => {
    setToken(accessToken);
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

  const loginAsAdmin = (email: string, r: AdminRole, accessToken: string, _mustChangePassword = false) => {
    setRole(r);
    setAdminEmail(email);
    setParent(null);
    setToken(accessToken);
    setAuthStep('logged_in');
  };

  const logout = () => {
    setRole(null);
    setParent(null);
    setAdminEmail(null);
    setAuthStep('logged_out');
    setPendingParent(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ role, parent, adminEmail, authStep, token, loginAsParent, loginAsAdmin, logout, setAuthStep, pendingParent, setPendingParent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
