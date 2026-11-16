import React from 'react';
import { TeamId, TEAM_COLORS, TEAM_DISPLAY_NAMES, TaskStatusType } from '../types';

interface ProgressBarProps {
  teams: TeamId[];
  statuses: Record<TeamId, TaskStatusType>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ teams, statuses }) => {
  if (teams.length === 0) return null;

  const total = teams.length;
  const doneCount = teams.filter((t) => statuses[t] === 'done').length;
  const percent = Math.round((100 * doneCount) / total);

  // Identify waiting teams
  const waitingTeams = teams
    .filter((t) => statuses[t] !== 'done')
    .map((t) => TEAM_DISPLAY_NAMES[t]);

  let statusLabel = '';
  if (percent === 100) {
    statusLabel = '100% complete';
  } else if (waitingTeams.length === 1) {
    statusLabel = `${percent}% complete · waiting on ${waitingTeams[0]}`;
  } else if (waitingTeams.length > 1) {
    statusLabel = `${percent}% complete · waiting on ${waitingTeams[0]} +${waitingTeams.length - 1}`;
  } else {
    statusLabel = `${percent}% complete`;
  }

  // Text alternative for screen readers
  const ariaText = teams
    .map((t) => `${TEAM_DISPLAY_NAMES[t]}: ${statuses[t]}`)
    .join(', ');

  return (
    <div className="w-full mt-3">
      <div className="flex items-center justify-between text-xs text-muted mb-1.5 font-medium">
        <span>{statusLabel}</span>
        {percent === 100 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Completed
          </span>
        ) : (
          <span>{doneCount} of {total} done</span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${percent}%. Teams: ${ariaText}`}
        className="w-full h-2.5 rounded-full bg-hairline/60 overflow-hidden flex gap-1 p-0.5"
      >
        {teams.map((t) => {
          const st = statuses[t] || 'todo';
          const color = TEAM_COLORS[t];

          return (
            <div
              key={t}
              title={`${TEAM_DISPLAY_NAMES[t]}: ${st}`}
              className="h-full flex-1 rounded-sm transition-all duration-300 motion-reduce:transition-none"
              style={{
                backgroundColor: st === 'done' ? color : st === 'working' ? color : 'transparent',
                borderColor: st === 'working' ? color : undefined,
                borderWidth: st === 'working' ? '1px' : undefined,
                opacity: st === 'todo' ? 0.25 : 1.0,
              }}
            >
              {st === 'working' && <div className="w-full h-full progress-striped" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
