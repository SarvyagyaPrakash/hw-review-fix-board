import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Activity, Sparkles, Check } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-md my-auto max-h-[90vh] overflow-y-auto rounded-2xl border border-hairline/80 dark:border-[#3A3C39] bg-white dark:bg-[#1c1e1d] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
        style={{ backgroundColor: 'var(--paper)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-hairline/60">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="Hitwicket" className="w-6 h-6 rounded-lg shadow-2xs" />
            <h2 id="info-modal-title" className="font-heading font-extrabold text-base text-ink tracking-tight">
              HW Review-Fix Board
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content (Under 150 words) */}
        <div className="space-y-3 text-xs leading-relaxed text-ink">
          <p className="font-medium text-muted">
            An independent product intelligence dashboard analyzing <strong>3,000 public 1–3 star Google Play reviews</strong> of Hitwicket Cricket Strategy Game.
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-canvas/40 border border-hairline/50">
              <Layers className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-ink">1. Triage by Role</span>
                <p className="text-muted text-[11px] mt-0.5">
                  Select your team from “Viewing as” to see issues, verbatim quotes, and watch metrics routed to your discipline.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-canvas/40 border border-hairline/50">
              <Activity className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-ink">2. Realtime Tracking</span>
                <p className="text-muted text-[11px] mt-0.5">
                  Update statuses across To do, Working, and Done. Multi-team tasks show live synchronized progress across teams.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-canvas/40 border border-hairline/50">
              <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-ink">3. Fix First Priorities</span>
                <p className="text-muted text-[11px] mt-0.5">
                  Review the top 3 highest-impact problem areas with transparent priority formulas and AI-suggested experiments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold bg-ink text-paper hover:opacity-90 active:scale-95 transition-all shadow-2xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Got it, let’s explore</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
