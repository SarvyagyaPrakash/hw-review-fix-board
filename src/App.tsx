import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ActivityDrawer } from './components/ActivityDrawer';
import { BoardPage } from './pages/BoardPage';
import { useData } from './context/DataContext';

// Lazy-loaded routes per AGENTS.md § 6 & Stage 6
const FixFirstPage = lazy(() =>
  import('./pages/FixFirstPage').then((m) => ({ default: m.FixFirstPage }))
);
const InsightsPage = lazy(() =>
  import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage }))
);
const ExplorerPage = lazy(() =>
  import('./pages/ExplorerPage').then((m) => ({ default: m.ExplorerPage }))
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);

export const App: React.FC = () => {
  const { loading, error, retry } = useData();
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const location = useLocation();

  const isBoardRoute = location.pathname === '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-ink border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-heading font-bold text-sm text-ink">Loading triage datasets…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-card bg-paper border border-hairline shadow-lg text-center space-y-4">
          <h2 className="font-heading font-extrabold text-xl text-ink">Unable to Load Data</h2>
          <p className="text-xs text-muted leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-ink text-paper"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to Main Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-paper focus:rounded-lg focus:text-xs focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Global Header */}
      <Header onOpenActivity={() => setIsActivityOpen(true)} />

      {/* Main Body Shell */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar on Board Route */}
          {isBoardRoute && <Sidebar />}

          {/* Main Route Content Landmark */}
          <main id="main-content" className="flex-1 min-w-0" tabIndex={-1}>
            <Suspense
              fallback={
                <div className="py-24 text-center text-xs text-muted font-medium">
                  Loading section…
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<BoardPage />} />
                <Route path="/fix-first" element={<FixFirstPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>

      {/* Activity Drawer */}
      <ActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      {/* Editorial Footer */}
      <footer className="mt-auto border-t border-hairline/60 bg-paper/60 backdrop-blur-md py-6 text-center text-xs text-muted no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            Independent analysis of public Google Play reviews. Not affiliated with Hitwicket. AI-assisted; may contain errors.
          </p>
          <p className="font-semibold text-ink">Built by Sarvyagya Prakash</p>
        </div>
      </footer>
    </div>
  );
};
