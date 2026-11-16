import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { taskStore } from '../store/TaskStore';
import { TeamId, TEAM_DISPLAY_NAMES, TEAM_COLORS } from '../types';

export const Sidebar: React.FC = () => {
  const { reviews, selectedTeam, setSelectedTeam } = useData();

  // Compute open (not done) counts per team
  const openCounts = useMemo(() => {
    const counts: Partial<Record<TeamId, number>> = {};
    (Object.keys(TEAM_DISPLAY_NAMES) as TeamId[]).forEach((tm) => {
      counts[tm] = 0;
    });

    reviews.forEach((r) => {
      if (!r.actionable) return;
      r.teams.forEach((t) => {
        const status = taskStore.getStatus(r.id, t.team);
        if (status !== 'done') {
          counts[t.team] = (counts[t.team] || 0) + 1;
        }
      });
    });

    return counts;
  }, [reviews]);

  const allOpenTotal = useMemo(() => {
    return Object.values(openCounts).reduce((a, b) => (a || 0) + (b || 0), 0) || 0;
  }, [openCounts]);

  const teamList = Object.entries(TEAM_DISPLAY_NAMES) as [TeamId, string][];

  return (
    <aside className="w-full lg:w-64 shrink-0 py-4 lg:py-6">
      <div className="text-xs font-bold uppercase tracking-wider text-muted px-3 mb-2 hidden lg:block">
        Teams
      </div>

      <nav
        aria-label="Team filters"
        className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 px-1 scrollbar-none"
      >
        {/* All Teams Button */}
        <button
          type="button"
          onClick={() => setSelectedTeam(null)}
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 lg:w-full ${
            selectedTeam === null
              ? 'bg-ink text-paper shadow-sm'
              : 'text-muted hover:text-ink hover:bg-paper/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>All teams</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 ${
              selectedTeam === null ? 'bg-paper/20 text-paper' : 'bg-canvas text-muted'
            }`}
          >
            {allOpenTotal}
          </span>
        </button>

        {/* 9 Individual Teams */}
        {teamList.map(([id, name]) => {
          const isSelected = selectedTeam === id;
          const count = openCounts[id] || 0;
          const color = TEAM_COLORS[id];

          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedTeam(id)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 lg:w-full ${
                isSelected
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-paper/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{name}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 ${
                  isSelected ? 'bg-paper/20 text-paper' : 'bg-canvas text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
