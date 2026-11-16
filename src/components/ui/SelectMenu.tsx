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
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button: iOS frosted capsule matching website bg */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center justify-between gap-2 rounded-xl border border-hairline/80 dark:border-white/10 bg-paper/70 dark:bg-[#1e201f]/75 backdrop-blur-md text-ink dark:text-[#ECEAE5] shadow-2xs hover:bg-paper/90 dark:hover:bg-[#1e201f]/90 transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-ink ${heightClass} ${className}`}
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

      {/* iOS Frosted Floating Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 mt-1.5 min-w-[180px] max-w-[280px] rounded-2xl border border-hairline/80 dark:border-white/15 bg-paper/95 dark:bg-[#1c1e1d]/95 backdrop-blur-2xl shadow-2xl p-1.5 space-y-0.5 outline-none transition-all duration-150 transform origin-top max-h-72 overflow-y-auto ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
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
                    ? 'bg-ink/8 dark:bg-white/15 text-ink dark:text-white font-semibold shadow-2xs'
                    : 'text-ink/80 dark:text-[#ECEAE5]/80 hover:bg-canvas/70 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white'
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
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-canvas/80 text-muted">
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
