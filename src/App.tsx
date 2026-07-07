import { useState } from 'react';
import Sidebar, { Page } from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import EmployeesPage from './pages/EmployeesPage';
import ProductionDataPage from './pages/ProductionDataPage';
import ProductionAnalysisPage from './pages/ProductionAnalysisPage';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={p => setActivePage(p as Page)} />;
      case 'products':
        return <ProductsPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'production-data':
        return <ProductionDataPage />;
      case 'production-analysis':
        return <ProductionAnalysisPage />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Biotrol Professional</span>
            <span className="text-gray-300 text-xs">|</span>
            <span className="text-xs text-gray-400">Production Management System</span>
          </div>
          <div className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
