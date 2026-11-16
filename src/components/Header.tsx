import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { taskStore } from '../store/TaskStore';
import { TeamId, TEAM_DISPLAY_NAMES, TEAM_COLORS } from '../types';
import { Sun, Moon, History, Radio } from 'lucide-react';

interface HeaderProps {
  onOpenActivity: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenActivity }) => {
  const { viewingAsTeam, setViewingAsTeam, actorName, setActorName, theme, toggleTheme } = useData();
  const [editingActor, setEditingActor] = useState(false);
  const [tempActor, setTempActor] = useState(actorName);

  const syncState = taskStore.syncState;
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

        {/* Right Utility Bar: Viewing as, Sync status, Activity, Theme toggle */}
        <div className="flex items-center gap-3">
          {/* "Viewing as" Team Selector */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-hairline text-xs">
            <span className="text-muted font-medium">Viewing as:</span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: TEAM_COLORS[viewingAsTeam] }}
              />
              <select
                aria-label="Select active team role"
                value={viewingAsTeam}
                onChange={(e) => {
                  const t = e.target.value as TeamId;
                  setViewingAsTeam(t);
                  setActorName(TEAM_DISPLAY_NAMES[t]);
                  setTempActor(TEAM_DISPLAY_NAMES[t]);
                }}
                className="bg-canvas/60 text-ink font-semibold rounded px-2 py-1 border border-hairline outline-none focus:border-ink cursor-pointer text-xs"
              >
                {Object.entries(TEAM_DISPLAY_NAMES).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              {editingActor ? (
                <input
                  type="text"
                  maxLength={40}
                  value={tempActor}
                  onChange={(e) => setTempActor(e.target.value)}
                  onBlur={() => {
                    setActorName(tempActor.trim() || TEAM_DISPLAY_NAMES[viewingAsTeam]);
                    setEditingActor(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActorName(tempActor.trim() || TEAM_DISPLAY_NAMES[viewingAsTeam]);
                      setEditingActor(false);
                    }
                  }}
                  autoFocus
                  className="bg-paper border border-ink px-1.5 py-0.5 rounded text-xs w-28 text-ink"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingActor(true)}
                  title="Click to edit your display name"
                  className="text-muted hover:text-ink underline decoration-dotted max-w-[100px] truncate"
                >
                  ({actorName})
                </button>
              )}
            </div>
          </div>

          {/* Sync Pill */}
          <div
            title={`Realtime Sync State: ${syncState}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-hairline bg-canvas/60"
          >
            <Radio
              className={`w-3 h-3 ${
                syncState === 'live'
                  ? 'text-emerald-500 animate-pulse'
                  : syncState === 'connecting'
                  ? 'text-amber-500'
                  : 'text-muted'
              }`}
            />
            <span className="capitalize text-muted text-[11px]">{isLocalOnly ? 'Local' : syncState}</span>
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
