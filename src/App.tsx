import React, { useState } from 'react';
import Sidebar, { Page } from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import EmployeesPage from './pages/EmployeesPage';
import ProductionDataPage from './pages/ProductionDataPage';
import ProductionAnalysisPage from './pages/ProductionAnalysisPage';
import ProductionComparisonPage from './pages/ProductionComparisonPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { Lock } from 'lucide-react';

function ProtectedPage({
  page,
  activePage,
  setActivePage,
}: {
  page: Page;
  activePage: Page;
  setActivePage: (p: Page) => void;
}) {
  const { isAdmin, isEmployee, isViewer } = useAuth();

  // Viewer: read-only access to Dashboard, Products, Production Analysis only
  if (isViewer) {
    if (page === 'dashboard') {
      return <DashboardPage onNavigate={p => setActivePage(p as Page)} />;
    }
    if (page === 'products') {
      return <ProductsPage readOnly={true} />;
    }
    if (page === 'production-analysis') {
      return <ProductionAnalysisPage />;
    }
    return <AccessDenied message="You don't have permission to access this page." />;
  }

  // Employee access
  if (isEmployee) {
    if (page === 'dashboard') {
      return <DashboardPage onNavigate={p => setActivePage(p as Page)} />;
    }
    if (page === 'products') {
      return <ProductsPage readOnly={true} />;
    }
    if (page === 'production-data') {
      return <ProductionDataPage />;
    }
    if (page === 'production-analysis') {
      return <ProductionAnalysisPage />;
    }
    if (page === 'production-comparison') {
      return <ProductionComparisonPage />;
    }
    if (page === 'employees') {
      return <AccessDenied message="You don't have permission to access the Employees page." />;
    }
    if (page === 'settings') {
      return <AccessDenied message="You don't have permission to access the Settings page." />;
    }
  }

  // Admin has full access
  if (isAdmin) {
    switch (page) {
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
      case 'production-comparison':
        return <ProductionComparisonPage />;
      case 'settings':
        return <SettingsPage />;
    }
  }

  // Default render for any unmatched cases
  return <DashboardPage onNavigate={p => setActivePage(p as Page)} />;
}

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="bg-red-50 rounded-full p-4 mb-4">
        <Lock size={32} className="text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Access Denied</h2>
      <p className="text-sm text-gray-500 max-w-md">{message}</p>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState<Page>('dashboard');

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login page
  if (!user) {
    return <LoginPage />;
  }

  function renderPage() {
    return (
      <ProtectedPage
        page={activePage}
        activePage={activePage}
        setActivePage={setActivePage}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Biotrol Professional</span>
            <span className="text-gray-300 text-xs">|</span>
            <span className="text-xs text-gray-400">Production Management System</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium text-gray-600">{user.email}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                user.role === 'admin'
                  ? 'bg-blue-100 text-blue-700'
                  : user.role === 'viewer'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {user.role === 'admin' ? 'Admin' : user.role === 'viewer' ? 'Viewer' : 'Employee'}
              </span>
            </div>
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

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
