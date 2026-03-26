import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Parent } from '@/data/mockData';

type UserRole = 'parent' | 'gestionnaire' | 'super_admin' | null;
type AuthStep = 'logged_out' | 'force_password_change' | 'forgot_password' | 'logged_in';

interface AuthContextType {
  role: UserRole;
  parent: Parent | null;
  adminEmail: string | null;
  authStep: AuthStep;
  loginAsParent: (parent: Parent) => void;
  loginAsAdmin: (email: string, role: 'gestionnaire' | 'super_admin') => void;
  logout: () => void;
  setAuthStep: (step: AuthStep) => void;
  pendingParent: Parent | null;
  setPendingParent: (p: Parent | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('logged_out');
  const [pendingParent, setPendingParent] = useState<Parent | null>(null);

  const loginAsParent = (p: Parent) => {
    if (p.premiereConnexion) {
      setPendingParent(p);
      setAuthStep('force_password_change');
      return;
    }
    setRole('parent');
    setParent(p);
    setAdminEmail(null);
    setAuthStep('logged_in');
  };

  const loginAsAdmin = (email: string, r: 'gestionnaire' | 'super_admin') => {
    setRole(r);
    setAdminEmail(email);
    setParent(null);
    setAuthStep('logged_in');
  };

  const logout = () => {
    setRole(null);
    setParent(null);
    setAdminEmail(null);
    setAuthStep('logged_out');
    setPendingParent(null);
  };

  return (
    <AuthContext.Provider value={{ role, parent, adminEmail, authStep, loginAsParent, loginAsAdmin, logout, setAuthStep, pendingParent, setPendingParent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
