import React from 'react';
import { BrandLogo } from './BrandLogo';
import { User, PermissionKey } from '../../types';
import { RBACService } from '../../services/rbacService';
import { 
  LayoutDashboard, Users, UserCheck, FileText, Briefcase, 
  Wrench, Cpu, Package, Receipt, CreditCard, Calendar, 
  BarChart3, MessageSquare, Zap, Settings, ShieldCheck,
  ChevronRight, ArrowRightLeft, UserCog, X
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'crm'
  | 'customers'
  | 'offers'
  | 'projects'
  | 'installations'
  | 'service'
  | 'inventory'
  | 'invoices'
  | 'payments'
  | 'calendar'
  | 'reports'
  | 'communications'
  | 'automations'
  | 'users'
  | 'settings';

export type NavigationTab = NavTab;

interface SidebarProps {
  currentTab?: NavTab;
  activeTab?: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: User;
  users: User[];
  onSwitchUser?: (userId: string) => void;
  onUserChange?: (user: User) => void;
  pendingOffersCount?: number;
  activeServicesCount?: number;
  todayInstallationsCount?: number;
  badges?: {
    leads?: number;
    offers?: number;
    installations?: number;
    services?: number;
    lowStock?: number;
  };
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onTabChange,
  currentUser,
  users,
  onSwitchUser,
  onUserChange,
  pendingOffersCount,
  activeServicesCount,
  todayInstallationsCount,
  badges = {},
  className = '',
  isOpen = false,
  onClose,
}) => {
  const selectedTab = activeTab || currentTab || 'dashboard';
  const effectiveBadges = {
    ...badges,
    offers: pendingOffersCount ?? badges.offers,
    services: activeServicesCount ?? badges.services,
    installations: todayInstallationsCount ?? badges.installations,
  };

  const handleSwitch = (userId: string) => {
    if (onSwitchUser) onSwitchUser(userId);
    if (onUserChange) {
      const u = users.find(x => x.id === userId);
      if (u) onUserChange(u);
    }
  };

  const handleTabClick = (tabId: NavTab) => {
    onTabChange(tabId);
    if (onClose) {
      onClose();
    }
  };

  const rawNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
    badge?: number;
    badgeColor?: string;
    requiredPermission?: PermissionKey;
    adminOnly?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM / Leadler', icon: Users, badge: effectiveBadges.leads, badgeColor: 'bg-blue-500', requiredPermission: 'crm.view' },
    { id: 'customers', label: 'Müşteriler', icon: UserCheck, requiredPermission: 'customers.view' },
    { id: 'offers', label: 'Teklifler', icon: FileText, badge: effectiveBadges.offers, badgeColor: 'bg-amber-500', requiredPermission: 'offers.view' },
    { id: 'projects', label: 'Projeler / İş Emirleri', icon: Briefcase, requiredPermission: 'projects.view' },
    { id: 'installations', label: 'Montaj Planı', icon: Wrench, badge: effectiveBadges.installations, badgeColor: 'bg-emerald-500', requiredPermission: 'installation.view' },
    { id: 'service', label: 'Teknik Servis', icon: Cpu, badge: effectiveBadges.services, badgeColor: 'bg-purple-500', requiredPermission: 'service.view' },
    { id: 'inventory', label: 'Ürünler & Stok', icon: Package, badge: effectiveBadges.lowStock, badgeColor: 'bg-red-500', requiredPermission: 'inventory.view' },
    { id: 'invoices', label: 'Faturalar', icon: Receipt, requiredPermission: 'invoice.view' },
    { id: 'payments', label: 'Tahsilatlar', icon: CreditCard, requiredPermission: 'payments.manage' },
    { id: 'calendar', label: 'Takvim / Görevler', icon: Calendar },
    { id: 'reports', label: 'Raporlar', icon: BarChart3, requiredPermission: 'reports.view' },
    { id: 'communications', label: 'İletişim Merkezi', icon: MessageSquare },
    { id: 'automations', label: 'Otomasyonlar', icon: Zap, requiredPermission: 'automations.manage' },
    { id: 'users', label: 'Kullanıcılar & Yetkiler', icon: UserCog, badge: users.length, badgeColor: 'bg-indigo-600', requiredPermission: 'users.manage' },
    { id: 'settings', label: 'Yönetim / Ayarlar', icon: Settings, requiredPermission: 'settings.manage' },
  ];

  const navItems = rawNavItems.filter((item) => {
    if (RBACService.isSuperAdmin(currentUser)) return true;
    if (item.requiredPermission) {
      return RBACService.hasPermission(item.requiredPermission, currentUser);
    }
    return true;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
      {/* Brand Logo Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex flex-col">
          <BrandLogo size="md" variant="dark" />
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1 px-1">
            CRM • ERP • SAHA OPERASYON
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Menüyü Kapat"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${item.badgeColor || 'bg-blue-500'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active User & Quick RBAC Role Switcher */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck size={12} className="text-blue-400" /> Aktif Oturum (RBAC)
          </span>
          <div className="relative group">
            <label className="cursor-pointer text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5">
              <ArrowRightLeft size={10} /> Değiştir
            </label>
            <select
              value={currentUser.id}
              onChange={(e) => handleSwitch(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              title="Kullanıcı / Rol Değiştir"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.roleTitle})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-xl border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
            {currentUser.fullName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-200 truncate">{currentUser.fullName}</div>
            <div className="text-[10px] text-blue-400 font-medium truncate">{currentUser.roleTitle}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Masaüstü Sabit Sidebar */}
      <aside className={`hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col h-screen border-r border-slate-800 sticky top-0 shrink-0 ${className}`}>
        {sidebarContent}
      </aside>

      {/* Mobil Açılır Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
