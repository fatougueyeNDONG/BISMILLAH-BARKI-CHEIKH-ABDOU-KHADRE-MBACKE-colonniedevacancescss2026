import React from 'react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, List, BarChart3, Users, Settings, ChevronDown, Award, UserCheck, History, Database, ListChecks, Briefcase, MapPin, MessageSquare } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import logo from '@/assets/logo.png';

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
  isSuperAdmin: boolean;
}

export function AdminSidebar({ currentPage, onNavigate, isSuperAdmin }: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isListeActive = ['liste_principale', 'liste_n1', 'liste_n2'].includes(currentPage);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {!collapsed && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <img src={logo} alt="CSS" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-display font-bold text-sm text-sidebar-foreground">{isSuperAdmin ? 'Super Admin' : 'Gestionnaire'}</p>
                <p className="text-xs text-sidebar-foreground/60">Colonie 2026</p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onNavigate('dashboard')} isActive={currentPage === 'dashboard'} tooltip="Tableau de bord">
                  <LayoutDashboard className="w-4 h-4" />{!collapsed && <span>Tableau de bord</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onNavigate('inscriptions')} isActive={currentPage === 'inscriptions'} tooltip="Inscriptions">
                  <FileText className="w-4 h-4" />{!collapsed && <span>Liste des inscriptions</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed ? (
                <Collapsible defaultOpen={isListeActive}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Gestion des listes">
                        <List className="w-4 h-4" /><span className="flex-1">Gestion des listes</span><ChevronDown className="w-3 h-3" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => onNavigate('liste_principale')} isActive={currentPage === 'liste_principale'}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />Liste Principale
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => onNavigate('liste_n1')} isActive={currentPage === 'liste_n1'}>
                            <span className="w-2 h-2 rounded-full bg-accent mr-2" />Liste N°1
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton onClick={() => onNavigate('liste_n2')} isActive={currentPage === 'liste_n2'}>
                            <span className="w-2 h-2 rounded-full bg-primary mr-2" />Liste N°2
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('liste_principale')} isActive={isListeActive} tooltip="Gestion des listes">
                    <List className="w-4 h-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onNavigate('liste_finale')} isActive={currentPage === 'liste_finale'} tooltip="Liste finale">
                  <Award className="w-4 h-4" />{!collapsed && <span>Liste finale des retenus</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onNavigate('statistiques')} isActive={currentPage === 'statistiques'} tooltip="Statistiques">
                  <BarChart3 className="w-4 h-4" />{!collapsed && <span>Statistiques</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onNavigate('historique')} isActive={currentPage === 'historique'} tooltip="Historique">
                  <History className="w-4 h-4" />{!collapsed && <span>Historique</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('gestion_listes_config')} isActive={currentPage === 'gestion_listes_config'} tooltip="Listes">
                    <ListChecks className="w-4 h-4" />{!collapsed && <span>Listes</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('gestion_services')} isActive={currentPage === 'gestion_services'} tooltip="Services">
                    <Briefcase className="w-4 h-4" />{!collapsed && <span>Services</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('gestion_sites')} isActive={currentPage === 'gestion_sites'} tooltip="Agences">
                    <MapPin className="w-4 h-4" />{!collapsed && <span>Agences</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('utilisateurs')} isActive={currentPage === 'utilisateurs'} tooltip="Utilisateurs">
                    <Users className="w-4 h-4" />{!collapsed && <span>Utilisateurs</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('parents_list')} isActive={currentPage === 'parents_list'} tooltip="Envoie Mails">
                    <UserCheck className="w-4 h-4" />{!collapsed && <span>Envoie Mails</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('envoie_sms')} isActive={currentPage === 'envoie_sms'} tooltip="Envoie SMS">
                    <MessageSquare className="w-4 h-4" />{!collapsed && <span>Envoie SMS</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('journal_logs')} isActive={currentPage === 'journal_logs'} tooltip="Journal et Logs">
                    <Database className="w-4 h-4" />{!collapsed && <span>Journal et Logs</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => onNavigate('parametres')} isActive={currentPage === 'parametres'} tooltip="Paramètres">
                    <Settings className="w-4 h-4" />{!collapsed && <span>Paramètres</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
