import React, { useEffect, useState } from 'react';
import { taskStore } from '../store/TaskStore';
import { TaskActivityRecord, TEAM_COLORS, TEAM_DISPLAY_NAMES } from '../types';
import { X, Clock } from 'lucide-react';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState<TaskActivityRecord[]>(() => taskStore.getActivities(50));

  useEffect(() => {
    const unsubscribe = taskStore.subscribe(() => {
      setActivities(taskStore.getActivities(50));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div
        role="dialog"
        aria-label="Recent activity log"
        aria-modal="true"
        className="w-full max-w-md bg-paper border-l border-hairline h-full shadow-2xl flex flex-col transition-all"
      >
        <div className="p-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted" />
            <h3 className="font-heading font-bold text-base text-ink">Recent Activity</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activities.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No recent team activity logged yet.</p>
          ) : (
            activities.map((act) => {
              const teamColor = TEAM_COLORS[act.team];
              const teamName = TEAM_DISPLAY_NAMES[act.team];
              const dateStr = new Date(act.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={act.id} className="text-xs p-3 rounded-xl border border-hairline/60 bg-canvas/30 space-y-1">
                  <div className="flex items-center justify-between text-muted text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
                      <span className="font-semibold text-ink">{teamName}</span>
                    </div>
                    <span>{dateStr}</span>
                  </div>

                  <p className="text-ink">
                    <span className="font-bold">{act.actor || 'Someone'}</span>{' '}
                    {act.kind === 'status' && (
                      <>
                        changed status to <span className="font-bold uppercase tracking-wider">{act.to_value}</span>
                      </>
                    )}
                    {act.kind === 'assignee' && (
                      <>
                        assigned task to <span className="font-bold">{act.to_value || 'Unassigned'}</span>
                      </>
                    )}
                    {act.kind === 'note' && <>posted a note</>}
                    {act.kind === 'viewing' && (
                      <>
                        is viewing the board as <span className="font-bold">{teamName}</span>
                      </>
                    )}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
