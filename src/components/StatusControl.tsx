import React from 'react';
import { TaskStatusType, TeamId, TEAM_COLORS } from '../types';

interface StatusControlProps {
  team: TeamId;
  currentStatus: TaskStatusType;
  onChange: (newStatus: TaskStatusType) => void;
  disabled?: boolean;
}

export const StatusControl: React.FC<StatusControlProps> = ({
  team,
  currentStatus,
  onChange,
  disabled = false,
}) => {
  const teamColor = TEAM_COLORS[team];
  const options: { id: TaskStatusType; label: string }[] = [
    { id: 'todo', label: 'To do' },
    { id: 'working', label: 'Working' },
    { id: 'done', label: 'Done' },
  ];

  return (
    <div
      role="group"
      aria-label={`Status control for ${team}`}
      className="inline-flex rounded-lg border border-hairline p-0.5 bg-paper/60 backdrop-blur-sm"
    >
      {options.map((opt) => {
        const isActive = currentStatus === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(opt.id)}
            className="px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200"
            style={{
              backgroundColor: isActive ? teamColor : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--muted)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
