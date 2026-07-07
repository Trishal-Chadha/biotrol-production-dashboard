import React from 'react';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  BarChart2,
  Users,
  ChevronRight,
  Activity,
  Menu,
  X,
} from 'lucide-react';

export type Page =
  | 'dashboard'
  | 'products'
  | 'employees'
  | 'production-data'
  | 'production-analysis';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
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

const navSections: NavSection[] = [
  {
    heading: 'Main Menu',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { id: 'products', label: 'Products', icon: <Package size={18} /> },
      { id: 'employees', label: 'Employees', icon: <Users size={18} /> },
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

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-[#0f2744] text-white h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } flex-shrink-0`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="bg-blue-500 rounded-lg p-1.5 flex-shrink-0">
              <Activity size={16} className="text-white" />
            </div>
            <div className="leading-tight overflow-hidden">
              <p className="text-xs font-bold text-white truncate">BIOTROL</p>
              <p className="text-[10px] text-blue-300 truncate">Professional</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto bg-blue-500 rounded-lg p-1.5">
            <Activity size={16} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="text-white/60 hover:text-white transition-colors p-1 rounded"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="mx-auto mt-3 text-white/60 hover:text-white transition-colors p-1 rounded"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.heading} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-blue-300/60 px-4 mb-1.5 font-semibold">
                {section.heading}
              </p>
            )}
            {collapsed && <div className="mx-4 my-2 border-t border-white/10" />}
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
                      } ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left leading-tight">{item.label}</span>
                          {isActive && <ChevronRight size={14} className="opacity-70 flex-shrink-0" />}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-[10px] text-white/30 text-center">
            &copy; {new Date().getFullYear()} Biotrol Professional
          </p>
        </div>
      )}
    </aside>
  );
}
