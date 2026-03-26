import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('force_login') === '1') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('parent_matricule');
      localStorage.removeItem('admin_email');
      sessionStorage.removeItem('pending_access_token');
      setRole(null);
      setParent(null);
      setAdminEmail(null);
      setAuthStep('logged_out');
      setPendingParent(null);
      url.searchParams.delete('force_login');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;
    const hydrateFromToken = async () => {
      try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const tokenRole = String(payload?.role || '').toUpperCase();
      if (tokenRole === 'PARENT') {
        let prenom = '';
        let nom = '';
        let service = '';
        try {
          const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
          const meResponse = await fetch(`${baseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const meData = await meResponse.json().catch(() => ({}));
          prenom = meData?.parent?.prenom || '';
          nom = meData?.parent?.nom || '';
          service = meData?.parent?.service || '';
        } catch {
          // Ignore /auth/me fetch error and keep fallback values.
        }
        setRole('parent');
        setParent({
          matricule: localStorage.getItem('parent_matricule') || '',
          prenom,
          nom,
          service,
          motDePasse: '',
          premiereConnexion: false,
        });
        setAuthStep('logged_in');
      } else if (tokenRole === 'GESTIONNAIRE' || tokenRole === 'SUPER_ADMIN') {
        setRole(tokenRole === 'SUPER_ADMIN' ? 'super_admin' : 'gestionnaire');
        setAdminEmail(localStorage.getItem('admin_email') || null);
        setAuthStep('logged_in');
      }
      } catch {
        localStorage.removeItem('access_token');
      }
    };
    void hydrateFromToken();
  }, []);

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
    localStorage.setItem('parent_matricule', p.matricule);
    localStorage.removeItem('admin_email');
  };

  const loginAsAdmin = (email: string, r: 'gestionnaire' | 'super_admin') => {
    setRole(r);
    setAdminEmail(email);
    setParent(null);
    setAuthStep('logged_in');
    localStorage.setItem('admin_email', email);
    localStorage.removeItem('parent_matricule');
  };

  const logout = () => {
    setRole(null);
    setParent(null);
    setAdminEmail(null);
    setAuthStep('logged_out');
    setPendingParent(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('parent_matricule');
    localStorage.removeItem('admin_email');
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
