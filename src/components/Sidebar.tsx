import React from 'react';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  BarChart2,
  Users,
  ChevronRight,
  Activity,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

export type Page =
  | 'dashboard'
  | 'products'
  | 'employees'
  | 'production-data'
  | 'production-analysis';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuth();

  const navSections: NavSection[] = [
    {
      heading: 'Main Menu',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'products', label: 'Products', icon: <Package size={18} /> },
        ...(user?.role === 'admin' ? [{ id: 'employees' as Page, label: 'Employees', icon: <Users size={18} /> }] : []),
      ],
    },
    {
      heading: 'Production & Packaging',
      items: [
        { id: 'production-data', label: 'Production Data', icon: <ClipboardList size={18} /> },
        { id: 'production-analysis', label: 'Production Analysis', icon: <BarChart2 size={18} /> },
      ],
    },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <aside className="flex flex-col bg-[#0f2744] text-white h-screen sticky top-0 w-64 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 min-h-[64px]">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="bg-blue-500 rounded-lg p-1.5 flex-shrink-0">
            <Activity size={16} className="text-white" />
          </div>
          <div className="leading-tight overflow-hidden">
            <p className="text-xs font-bold text-white truncate">BIOTROL</p>
            <p className="text-[10px] text-blue-300 truncate">Professional</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.heading} className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-blue-300/60 px-4 mb-1.5 font-semibold">
              {section.heading}
            </p>
            <ul className="space-y-0.5 px-2">
              {section.items.map(item => {
                const isActive = activePage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left leading-tight">{item.label}</span>
                      {isActive && <ChevronRight size={14} className="opacity-70 flex-shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="bg-white/5 rounded-lg px-3 py-2.5 mb-2">
          <p className="text-xs text-white/70 truncate">{user?.email}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5">
            <span className={`${
              user?.role === 'admin' ? 'text-blue-300' : 'text-emerald-300'
            }`}>
              {user?.role === 'admin' ? 'Administrator' : 'Employee'}
            </span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center">
          &copy; {new Date().getFullYear()} Biotrol Professional
        </p>
      </div>
    </aside>
  );
}
