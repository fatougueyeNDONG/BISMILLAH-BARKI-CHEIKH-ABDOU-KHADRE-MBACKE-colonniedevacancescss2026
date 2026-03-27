import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInscription } from '@/contexts/InscriptionContext';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ParentSidebar } from '@/components/parent/ParentSidebar';
import ParentDashboard from '@/components/parent/ParentDashboard';
import InscrireEnfant from '@/components/parent/InscrireEnfant';
import MesEnfants from '@/components/parent/MesEnfants';
import MesInscriptions from '@/components/parent/MesInscriptions';
import ToutesInscriptions from '@/components/parent/ToutesInscriptions';
import logo from '@/assets/logo.png';
import { LogOut } from 'lucide-react';

interface Props {
  initialPage?: string;
}

export default function ParentLayout({ initialPage }: Props) {
  const { parent, logout } = useAuth();
  const { settings, getEnfantsByParent } = useInscription();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(initialPage || 'dashboard');

  const now = new Date();
  const dateFin = settings.dateFinInscriptions ? new Date(settings.dateFinInscriptions + 'T23:59:59') : null;
  const inscriptionsCloturees = dateFin ? now > dateFin : false;

  const enfants = parent ? getEnfantsByParent(parent.matricule) : [];
  const allDesistes = inscriptionsCloturees && enfants.length > 0 && enfants.every(e => e.desistement === 'validé');

  useEffect(() => {
    if (initialPage) setCurrentPage(initialPage);
  }, [initialPage]);

  if (!parent) return null;

  const routeMap: Record<string, string> = {
    dashboard: '/dashboard',
    inscrire: '/dashboard/inscrire',
    enfants: '/dashboard/mes-enfants',
    inscriptions: '/dashboard/inscriptions',
    toutes_inscriptions: '/dashboard/toutes-inscriptions',
  };

  const handleNavigate = (page: string) => {
    // Block restricted pages after deadline
    if (inscriptionsCloturees && page === 'inscrire') return;
    if (allDesistes && !['dashboard', 'inscriptions'].includes(page)) return;
    setCurrentPage(page);
    if (routeMap[page]) navigate(routeMap[page]);
  };

  const renderPage = () => {
    // After deadline, block inscription page
    if (inscriptionsCloturees && currentPage === 'inscrire') return <ParentDashboard />;
    // If all désistés, only dashboard and inscriptions
    if (allDesistes && !['dashboard', 'inscriptions'].includes(currentPage)) return <ParentDashboard />;

    switch (currentPage) {
      case 'dashboard': return <ParentDashboard />;
      case 'inscrire': return <InscrireEnfant />;
      case 'enfants': return <MesEnfants />;
      case 'inscriptions': return <MesInscriptions />;
      case 'toutes_inscriptions': return <ToutesInscriptions />;
      default: return <ParentDashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ParentSidebar currentPage={currentPage} onNavigate={handleNavigate} />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground">{parent.prenom} {parent.nom}</p>
                <p className="text-xs text-muted-foreground">{parent.service}</p>
              </div>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
