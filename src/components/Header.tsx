import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { taskStore } from '../store/TaskStore';
import { TeamId, TEAM_DISPLAY_NAMES, TEAM_COLORS } from '../types';
import { Sun, Moon, History } from 'lucide-react';

interface HeaderProps {
  onOpenActivity: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenActivity }) => {
  const { viewingAsTeam, setViewingAsTeam, setActorName, theme, toggleTheme } = useData();

  const isLocalOnly = taskStore.isLocalOnly;

  const navItems = [
    { to: '/', label: 'Board' },
    { to: '/fix-first', label: 'Fix first' },
    { to: '/insights', label: 'Insights' },
    { to: '/explorer', label: 'Explorer' },
    { to: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-hairline/80 bg-paper/85 backdrop-blur-md transition-colors">
      {/* Local-only Banner if no Supabase credentials */}
      {isLocalOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-1 px-4 text-center text-xs font-medium text-amber-800 dark:text-amber-200">
          Shared sync is off · Running in local offline mode
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Route Links */}
        <div className="flex items-center gap-8">
          <NavLink to="/" className="font-heading font-extrabold text-lg sm:text-xl text-ink tracking-tight flex items-center gap-2">
            <span>HW Review-Fix Board</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-muted hover:text-ink hover:bg-canvas/50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Utility Bar: Viewing as, Activity, Theme toggle */}
        <div className="flex items-center gap-3">
          {/* "Viewing as" Team Selector */}
          <div className="flex items-center gap-2 pl-3 border-l border-hairline/80 text-xs">
            <span className="text-muted font-medium hidden sm:inline">Viewing as:</span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors"
                style={{ backgroundColor: TEAM_COLORS[viewingAsTeam] }}
              />
              <select
                aria-label="Select active team role"
                value={viewingAsTeam}
                onChange={(e) => {
                  const t = e.target.value as TeamId;
                  const name = TEAM_DISPLAY_NAMES[t];
                  setViewingAsTeam(t);
                  setActorName(name);
                  taskStore.recordViewer(name, t);
                }}
                className="bg-white dark:bg-[#1a1c1b] text-ink dark:text-[#ECEAE5] font-semibold rounded-lg px-2.5 py-1.5 border border-hairline/80 dark:border-[#3A3C39] outline-none focus:border-ink dark:focus:border-hairline cursor-pointer text-xs shadow-2xs transition-colors"
              >
                {Object.entries(TEAM_DISPLAY_NAMES).map(([id, name]) => (
                  <option key={id} value={id} className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Global Activity Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenActivity}
            title="Recent Activity Log"
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-canvas/60 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-canvas/60 transition-colors"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
