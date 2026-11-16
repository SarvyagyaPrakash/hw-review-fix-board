import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { taskStore } from '../store/TaskStore';
import { TeamId, TEAM_DISPLAY_NAMES, TEAM_COLORS } from '../types';
import { Sun, Moon, History } from 'lucide-react';
import { SelectMenu, SelectOption } from './ui/SelectMenu';

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

  const teamOptions: SelectOption[] = Object.entries(TEAM_DISPLAY_NAMES).map(([id, name]) => ({
    value: id,
    label: name,
    dotColor: TEAM_COLORS[id as TeamId],
  }));

  return (
    <header className="sticky top-0 z-30 border-b border-hairline/80 bg-paper/85 dark:bg-[#1c1e1d]/85 backdrop-blur-md transition-colors">
      {/* Local-only Banner if no Supabase credentials */}
      {isLocalOnly && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-1 px-4 text-center text-xs font-medium text-amber-800 dark:text-amber-200">
          Shared sync is off · Running in local offline mode
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Route Links */}
        <div className="flex items-center gap-8">
          <NavLink to="/" className="font-heading font-extrabold text-lg sm:text-xl text-ink tracking-tight flex items-center gap-2.5 group">
            <img src="/favicon.png" alt="Hitwicket" className="w-6 h-6 rounded-lg shadow-2xs group-hover:scale-105 transition-transform" />
            <span>HW Review-Fix Board</span>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `h-9 flex items-center px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-ink text-paper shadow-xs'
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
        <div className="flex items-center gap-2.5">
          {/* "Viewing as" Team Selector */}
          <div className="flex items-center gap-2 pl-3 border-l border-hairline/80 text-xs">
            <span className="text-muted font-medium hidden lg:inline">Viewing as:</span>
            <SelectMenu
              value={viewingAsTeam}
              options={teamOptions}
              onChange={(val) => {
                const t = val as TeamId;
                const name = TEAM_DISPLAY_NAMES[t];
                setViewingAsTeam(t);
                setActorName(name);
                taskStore.recordViewer(name, t);
              }}
              ariaLabel="Select active team role"
              align="right"
              className="rounded-full"
            />
          </div>

          {/* Global Activity Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenActivity}
            title="Recent Activity Log"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-hairline dark:border-[#3A3C39] bg-paper text-muted hover:text-ink hover:bg-canvas/50 shadow-2xs transition-all active:scale-95"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-hairline dark:border-[#3A3C39] bg-paper text-muted hover:text-ink hover:bg-canvas/50 shadow-2xs transition-all active:scale-95"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
