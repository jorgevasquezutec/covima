import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useSidebarStore } from '@/store/sidebar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardCheck,
  ClipboardList,
  Inbox,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  Trophy,
  Star,
  Settings,
  Gift,
  CalendarPlus,
  LayoutList,
  Medal,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles?: string[];
}

interface NavSection {
  title: string;
  roles?: string[];
  items: NavItem[];
  collapsible?: boolean; // Si la sección puede colapsarse
  defaultCollapsed?: boolean; // Si inicia colapsada
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    collapsible: false,
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Ranking', icon: Trophy, href: '/ranking' },
      { label: 'Mi Progreso', icon: Star, href: '/mi-progreso' },
    ],
  },
  {
    title: 'Gestión',
    roles: ['admin', 'lider'],
    collapsible: true,
    defaultCollapsed: false,
    items: [
      { label: 'Programas', icon: Calendar, href: '/programas' },
      { label: 'Partes Programa', icon: LayoutList, href: '/admin/partes-programa', roles: ['admin'] },
      { label: 'Asistencia', icon: ClipboardCheck, href: '/asistencias' },
      { label: 'Inbox', icon: Inbox, href: '/inbox' },
    ],
  },
  {
    title: 'Gamificación',
    roles: ['admin', 'lider'],
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { label: 'Períodos Ranking', icon: Trophy, href: '/admin/gamificacion/periodos', roles: ['admin'] },
      { label: 'Grupos Ranking', icon: Users, href: '/admin/gamificacion/grupos', roles: ['admin'] },
      { label: 'Registrar Evento', icon: CalendarPlus, href: '/admin/gamificacion/registrar' },
      { label: 'Eventos', icon: Gift, href: '/admin/gamificacion/eventos', roles: ['admin', 'lider'] },
      { label: 'Config Puntos', icon: Settings, href: '/admin/gamificacion/puntajes', roles: ['admin'] },
      { label: 'Niveles', icon: Medal, href: '/admin/gamificacion/niveles', roles: ['admin'] },
      { label: 'Historial Puntos', icon: History, href: '/admin/gamificacion/historial', roles: ['admin'] },
    ],
  },
  {
    title: 'Administración',
    roles: ['admin'],
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { label: 'Usuarios', icon: Users, href: '/usuarios' },
      { label: 'Tipos Asistencia', icon: ClipboardList, href: '/tipos-asistencia' },
    ],
  },
];

interface SidebarContentProps {
  collapsed: boolean;
  filteredSections: NavSection[];
  user: { nombre: string; codigoPais: string; telefono: string; fotoUrl?: string } | null;
  onNavClick: () => void;
  onLogout: () => void;
  onToggleCollapsed: () => void;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (title: string) => void;
}

function SidebarContent({
  collapsed,
  filteredSections,
  user,
  onNavClick,
  onLogout,
  onToggleCollapsed,
  collapsedSections,
  onToggleSection,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
          <span className="text-lg font-bold text-white">CO</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-bold text-gray-900 truncate">Covima</h1>
            <p className="text-xs text-gray-500 truncate">Sistema</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {filteredSections.map((section, sectionIndex) => {
          const isCollapsed = collapsedSections[section.title] ?? false;
          const canCollapse = section.collapsible && !collapsed;

          return (
            <div key={section.title} className={sectionIndex > 0 ? 'mt-3' : ''}>
              {/* Section Title */}
              {!collapsed && (
                <div className="px-3 mb-2">
                  {canCollapse ? (
                    <button
                      onClick={() => onToggleSection(section.title)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                    >
                      <span>{section.title}</span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          isCollapsed && '-rotate-90'
                        )}
                      />
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {section.title}
                    </span>
                  )}
                </div>
              )}
              {collapsed && sectionIndex > 0 && (
                <div className="mx-3 mb-2 border-t border-gray-200" />
              )}

              {/* Section Items */}
              <div
                className={cn(
                  'space-y-1 overflow-hidden transition-all duration-200',
                  canCollapse && isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                )}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-3">
        <NavLink
          to="/profile"
          onClick={onNavClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-2 py-2 rounded-lg transition-colors cursor-pointer',
              collapsed && 'justify-center',
              isActive ? 'bg-blue-50' : 'hover:bg-gray-100'
            )
          }
        >
          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
            {user?.fotoUrl ? (
              <img
                src={user.fotoUrl}
                alt={user?.nombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user?.nombre?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-500 truncate">+{user?.codigoPais} {user?.telefono}</p>
            </div>
          )}
        </NavLink>
        <Button
          variant="ghost"
          className={cn(
            'w-full mt-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100',
            collapsed && 'px-2'
          )}
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </div>

      {/* Collapse Button - Desktop */}
      <button
        onClick={onToggleCollapsed}
        className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );
}

// Obtener estado inicial de secciones colapsadas
function getInitialCollapsedState(): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  navSections.forEach((section) => {
    if (section.collapsible) {
      initial[section.title] = section.defaultCollapsed ?? false;
    }
  });
  return initial;
}

export default function Sidebar() {
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(getInitialCollapsedState);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMobileNavClick = () => {
    setMobileOpen(false);
  };

  const handleToggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Filtrar secciones e items según rol del usuario
  const filteredSections = navSections
    .filter((section) => {
      if (!section.roles) return true;
      return section.roles.some((role) => user?.roles.includes(role));
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        return item.roles.some((role) => user?.roles.includes(role));
      }),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContentProps = {
    filteredSections,
    user: user ? { nombre: user.nombre, codigoPais: user.codigoPais, telefono: user.telefono, fotoUrl: user.fotoUrl } : null,
    onLogout: handleLogout,
    onToggleCollapsed: toggleCollapsed,
    collapsedSections,
    onToggleSection: handleToggleSection,
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg text-gray-700 shadow-md"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent
          {...sidebarContentProps}
          collapsed={false}
          onNavClick={handleMobileNavClick}
        />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out shadow-sm',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <SidebarContent
          {...sidebarContentProps}
          collapsed={collapsed}
          onNavClick={() => {}}
        />
      </aside>
    </>
  );
}
