import React from 'react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, UserPlus, Users, FileText, HelpCircle, Eye } from 'lucide-react';
import { useInscription } from '@/contexts/InscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

const allItems = [
  { title: 'Tableau de bord', id: 'dashboard', icon: LayoutDashboard },
  { title: 'Inscrire un enfant', id: 'inscrire', icon: UserPlus },
  { title: 'Mes enfants', id: 'enfants', icon: Users },
  { title: 'Mes inscriptions', id: 'inscriptions', icon: FileText },
  { title: 'Toutes les inscriptions', id: 'toutes_inscriptions', icon: Eye },
];

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function ParentSidebar({ currentPage, onNavigate }: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { settings, getEnfantsByParent } = useInscription();
  const { parent } = useAuth();

  const now = new Date();
  const dateFin = settings.dateFinInscriptions ? new Date(settings.dateFinInscriptions + 'T23:59:59') : null;
  const inscriptionsCloturees = dateFin ? now > dateFin : false;

  // Check if all children have validated désistement
  const enfants = parent ? getEnfantsByParent(parent.matricule) : [];
  const allDesistes = inscriptionsCloturees && enfants.length > 0 && enfants.every(e => e.desistement === 'validé');

  // After deadline: only show dashboard + enfants (for désistement). If all désistés: only dashboard.
  const items = inscriptionsCloturees
    ? allDesistes
      ? allItems.filter(i => i.id === 'dashboard' || i.id === 'inscriptions')
      : allItems.filter(i => i.id !== 'inscrire')
    : allItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {!collapsed && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <img src={logo} alt="CSS" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-display font-bold text-sm text-sidebar-foreground">Espace Parent</p>
                <p className="text-xs text-sidebar-foreground/60">Colonie 2026</p>
              </div>
            </div>
          </div>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={() => onNavigate(item.id)} isActive={currentPage === item.id} tooltip={item.title}>
                    <item.icon className="w-4 h-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Aide</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Guide d'utilisation">
                  <HelpCircle className="w-4 h-4" />
                  {!collapsed && <span>Guide d'utilisation</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
