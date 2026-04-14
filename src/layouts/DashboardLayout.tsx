import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Users, CalendarDays, Laptop, FileText, StickyNote,
  Search, Bell, Plus, Moon, Sun, LogOut, Settings,
  Shield, Puzzle, UsersRound, ChevronDown, ChevronRight, ScrollText,
} from 'lucide-react';
import logoBranca2 from '../assets/logos/logo_oficial_branca2.png';
import logoNegoOficial from '../assets/logos/logo_nego_oficial.png';
import ProfileScreen    from '../pages/ProfileScreen';
import AccessProfiles   from '../pages/admin/AccessProfiles';
import ModulesScreen    from '../pages/admin/ModulesScreen';
import UsersManagement  from '../pages/admin/UsersManagement';
import PeopleScreen     from '../pages/PeopleScreen';
import ActivityLogsScreen from '../pages/admin/ActivityLogsScreen';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

// ─── Sidebar Items ────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: 'dashboard',        label: 'Visão Geral',         icon: LayoutDashboard },
  { id: 'pessoas',          label: 'Pessoas e Entidades',  icon: Users },
  { id: 'agenda',           label: 'Agenda',               icon: CalendarDays },
  { id: 'auto-atendimento', label: 'Auto Atendimento',     icon: Laptop },
  { id: 'requerimentos',    label: 'Requerimentos',        icon: FileText },
  { id: 'anotacoes',        label: 'Anotações',            icon: StickyNote },
];

const CONFIG_ITEMS = [
  { id: 'config/perfis',    label: 'Perfis de Acesso',     icon: Shield },
  { id: 'config/modulos',   label: 'Módulos',              icon: Puzzle },
  { id: 'config/usuarios',  label: 'Gestão de Usuários',   icon: UsersRound },
  { id: 'config/logs',      label: 'Logs de Atividade',    icon: ScrollText },
];

// ─── Content Router ───────────────────────────────────────────────────────────
const renderContent = (activeMenu: string, children: React.ReactNode) => {
  if (activeMenu === 'perfil')           return <ProfileScreen />;
  if (activeMenu === 'pessoas')          return <PeopleScreen />;
  if (activeMenu === 'config/perfis')    return <AccessProfiles />;
  if (activeMenu === 'config/modulos')   return <ModulesScreen />;
  if (activeMenu === 'config/usuarios')  return <UsersManagement />;
  if (activeMenu === 'config/logs')      return <ActivityLogsScreen />;
  return children;
};

// ─── Sidebar Item ─────────────────────────────────────────────────────────────
const SidebarBtn: React.FC<{
  id: string; label: string; icon: React.ElementType;
  active: boolean; onClick: () => void; indent?: boolean;
}> = ({ id: _id, label, icon: Icon, active, onClick, indent }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      indent ? 'ml-3 w-[calc(100%-12px)]' : ''
    } ${
      active
        ? 'bg-white/10 text-white'
        : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon className={`mr-3 h-4 w-4 ${active ? 'text-white' : 'text-blue-100/50'}`} />
    {label}
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onLogout }) => {
  const { profile, signOut, isAdmin, updateTheme } = useAuth();
  const handleLogout = onLogout ?? signOut;

  const [activeMenu, setActiveMenu]       = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [configOpen, setConfigOpen]       = useState(false);

  const isConfigActive = activeMenu.startsWith('config/');

  useEffect(() => {
    // Escuta mudanças de localStorage externas (caso existam) e inicial do sistema
    document.documentElement.classList.toggle('dark', isDarkMode);
    
    // Escuta eventos customizados de navegação (ex: vindo de botões no Dashboard)
    const handleNav = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveMenu(e.detail);
      }
    };
    window.addEventListener('navigate', handleNav);
    return () => window.removeEventListener('navigate', handleNav);
  }, [isDarkMode]);

  // Se o profile já carregou e temos o setting dele na context (vem do DB), mantemos sincronizados:
  useEffect(() => {
    if (profile?.theme) {
      setIsDarkMode(profile.theme === 'dark');
    }
  }, [profile?.theme]);

  const toggleDarkMode = () => {
    const nextTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(nextTheme === 'dark');
    if (updateTheme) {
      updateTheme(nextTheme);
    }
  };

  const handleConfigItem = (id: string) => {
    setActiveMenu(id);
    setConfigOpen(true);
  };

  return (
    <div className="flex h-screen bg-[#EDF1F4] dark:bg-slate-950 font-sans transition-colors duration-300">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-[#1e40af] dark:bg-slate-900 border-r border-white/10 dark:border-slate-800 flex flex-col transition-colors duration-300">

        {/* Logo */}
        <div className="p-4 flex items-center justify-center border-b border-white/10 dark:border-slate-800 shrink-0">
          <img
            src={isDarkMode ? logoBranca2 : logoNegoOficial}
            alt="Logo Vereador Nego"
            className="h-[80px] max-w-full w-auto object-contain drop-shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x40?text=Vereador+Nego'; }}
          />
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto pt-7 pb-2 px-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarBtn
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              active={activeMenu === item.id}
              onClick={() => setActiveMenu(item.id)}
            />
          ))}
        </div>

        {/* Bottom: Configurações + Sair */}
        <div className="p-4 border-t border-white/10 dark:border-slate-800 space-y-1">

          {/* Configurações — admin only */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isConfigActive
                    ? 'bg-white/10 text-white'
                    : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className={`mr-3 h-5 w-5 ${isConfigActive ? 'text-white' : 'text-blue-100/50'}`} />
                <span className="flex-1 text-left">Configurações</span>
                {configOpen
                  ? <ChevronDown className="h-4 w-4 text-blue-100/50" />
                  : <ChevronRight className="h-4 w-4 text-blue-100/50" />
                }
              </button>

              <AnimatePresence>
                {configOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-1 space-y-0.5"
                  >
                    {CONFIG_ITEMS.map((item) => (
                      <SidebarBtn
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        icon={item.icon}
                        active={activeMenu === item.id}
                        onClick={() => handleConfigItem(item.id)}
                        indent
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-blue-100/50" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 transition-colors duration-300">

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar requerimentos, pessoas, processos..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 ml-6">
            <button className="hidden md:flex items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
              <FileText className="h-4 w-4 mr-2" /> Gerar Relatório
            </button>
            <button className="hidden md:flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-500/20">
              <Plus className="h-4 w-4 mr-2" /> Novo Atendimento
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

            <button onClick={toggleDarkMode} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Profile chip */}
            <div
              className="ml-2 pl-4 border-l border-slate-200 dark:border-slate-800 flex items-center space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
              onClick={() => setActiveMenu('perfil')}
            >
              <img
                src={profile?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name ?? 'User'}`}
                alt={profile?.full_name ?? 'Usuário'}
                className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover"
              />
              <div className="hidden xl:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{profile?.full_name ?? 'Usuário'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {profile?.roles?.name ?? (profile?.role === 'admin' ? 'Administrador' : 'Colaborador')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div id="main-scroll-container" className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-[1600px] mx-auto">
            {renderContent(activeMenu, children)}
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardLayout;
