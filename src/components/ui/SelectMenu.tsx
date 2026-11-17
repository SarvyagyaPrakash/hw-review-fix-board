import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  dotColor?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  prefix?: string;
  className?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

export const SelectMenu: React.FC<SelectMenuProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  prefix,
  className = '',
  menuClassName = '',
  align = 'left',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Position flip: check if space below is limited
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 300 && rect.top > 300) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const heightClass = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs sm:text-xs font-semibold';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left transition-all ${isOpen ? 'z-50' : 'z-auto'}`}
    >
      {/* Trigger Button: solid themed capsule */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center justify-between gap-2 rounded-xl border border-hairline/80 dark:border-[#3A3C39] bg-paper text-ink shadow-2xs hover:bg-canvas/50 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ink ${heightClass} ${className}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {prefix && <span className="text-muted font-normal">{prefix}</span>}
          {selectedOption?.dotColor && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors shadow-2xs"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          )}
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-muted group-hover:text-ink transition-colors">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder || 'Select'}</span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-muted group-hover:text-ink transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 100% Solid Opaque Floating Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{ backgroundColor: 'var(--paper)' }}
          className={`absolute z-50 min-w-[220px] max-w-[320px] rounded-2xl border border-hairline dark:border-[#3A3C39] bg-white dark:bg-[#1c1e1d] shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-1.5 space-y-0.5 outline-none transition-all duration-150 max-h-80 overflow-y-auto ${
            openUpward ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
          } ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition-all ${
                  isSelected
                    ? 'bg-ink/10 dark:bg-white/15 text-ink dark:text-white font-semibold shadow-2xs'
                    : 'text-ink dark:text-[#ECEAE5] hover:bg-black/5 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.dotColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: opt.dotColor }}
                    />
                  )}
                  {opt.icon && <span className="flex-shrink-0 text-muted">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {opt.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-canvas text-muted">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-ink dark:text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
