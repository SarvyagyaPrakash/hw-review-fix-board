import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { ReviewCard } from '../components/ReviewCard';
import { taskStore } from '../store/TaskStore';
import { TEAM_DISPLAY_NAMES, TEAM_COLORS } from '../types';
import { Search, X, Filter, AlertCircle, CheckCircle2, Clock, Layers } from 'lucide-react';
import { SelectMenu, SelectOption } from '../components/ui/SelectMenu';

export const BoardPage: React.FC = () => {
  const { reviews, selectedTeam, taxonomy } = useData();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTheme, setFilterTheme] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStars, setFilterStars] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'thumbs'>('priority');

  // Pagination (25 at a time)
  const [visibleCount, setVisibleCount] = useState(25);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    taskStore.onRemoteChange = (team, _reviewId, newStatus, actor) => {
      setToastMessage(`${TEAM_DISPLAY_NAMES[team]} (${actor}) marked task “${newStatus}”`);
    };
    return () => {
      taskStore.onRemoteChange = undefined;
    };
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleCount(25);
  }, [selectedTeam, searchQuery, filterStatus, filterTheme, filterSeverity, filterStars, sortBy]);

  // Filter Actionable Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (!r.actionable) return false;

      // Team filter
      if (selectedTeam && !r.teams.some((t) => t.team === selectedTeam)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = r.text.toLowerCase().includes(q);
        const matchesProblems = r.issues.some((i) => i.problem.toLowerCase().includes(q));
        const matchesAlias = r.alias.toLowerCase().includes(q);
        if (!matchesText && !matchesProblems && !matchesAlias) return false;
      }

      // Theme filter
      if (filterTheme !== 'all') {
        if (!r.issues.some((i) => i.theme === filterTheme)) return false;
      }

      // Severity filter
      if (filterSeverity !== 'all') {
        const targetSev = parseInt(filterSeverity, 10);
        if (!r.issues.some((i) => i.severity === targetSev)) return false;
      }

      // Star filter
      if (filterStars !== 'all') {
        const targetStar = parseInt(filterStars, 10);
        if (r.stars !== targetStar) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (selectedTeam) {
          const st = taskStore.getStatus(r.id, selectedTeam);
          if (st !== filterStatus) return false;
        } else {
          // Global status filter
          const statuses = r.teams.map((t) => taskStore.getStatus(r.id, t.team));
          const allDone = statuses.every((s) => s === 'done');
          const anyWorking = statuses.some((s) => s === 'working');
          const allTodo = statuses.every((s) => s === 'todo');

          if (filterStatus === 'done' && !allDone) return false;
          if (filterStatus === 'working' && !(anyWorking || (!allDone && !allTodo))) return false;
          if (filterStatus === 'todo' && !allTodo) return false;
        }
      }

      return true;
    });
  }, [reviews, selectedTeam, searchQuery, filterTheme, filterSeverity, filterStars, filterStatus]);

  // Sort Reviews
  const sortedReviews = useMemo(() => {
    const list = [...filteredReviews];
    if (sortBy === 'newest') {
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    } else if (sortBy === 'thumbs') {
      list.sort((a, b) => b.thumbs - a.thumbs);
    } else {
      // Default: priority sort score
      list.sort((a, b) => (b.sort_score || 0) - (a.sort_score || 0));
    }
    return list;
  }, [filteredReviews, sortBy]);

  // Stat calculations
  const stats = useMemo(() => {
    let inProgress = 0;
    let done = 0;
    let completedReviews = 0;

    reviews.forEach((r) => {
      if (!r.actionable) return;
      const statuses = r.teams.map((t) => taskStore.getStatus(r.id, t.team));
      if (statuses.length > 0 && statuses.every((s) => s === 'done')) {
        completedReviews += 1;
      }
    });

    sortedReviews.forEach((r) => {
      if (selectedTeam) {
        const st = taskStore.getStatus(r.id, selectedTeam);
        if (st === 'working') inProgress += 1;
        if (st === 'done') done += 1;
      } else {
        r.teams.forEach((t) => {
          const st = taskStore.getStatus(r.id, t.team);
          if (st === 'working') inProgress += 1;
          if (st === 'done') done += 1;
        });
      }
    });

    return {
      inView: sortedReviews.length,
      inProgress,
      done,
      completedReviews,
    };
  }, [reviews, sortedReviews, selectedTeam]);

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0) +
    (filterTheme !== 'all' ? 1 : 0) +
    (filterSeverity !== 'all' ? 1 : 0) +
    (filterStars !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterTheme('all');
    setFilterSeverity('all');
    setFilterStars('all');
  };

  // iOS-style Select Options
  const sortOptions: SelectOption[] = [
    { value: 'priority', label: 'Priority formula' },
    { value: 'newest', label: 'Newest first' },
    { value: 'thumbs', label: 'Most thumbs-up' },
  ];

  const statusOptions: SelectOption[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'todo', label: 'To do', dotColor: '#9ca3af' },
    { value: 'working', label: 'Working', dotColor: '#f59e0b' },
    { value: 'done', label: 'Done', dotColor: '#10b981' },
  ];

  const themeOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [{ value: 'all', label: 'All themes' }];
    if (taxonomy?.themes) {
      taxonomy.themes.forEach((th) => {
        list.push({
          value: th.id,
          label: th.name,
          dotColor: th.teams[0] ? TEAM_COLORS[th.teams[0]] : undefined,
        });
      });
    }
    return list;
  }, [taxonomy]);

  const severityOptions: SelectOption[] = [
    { value: 'all', label: 'All severities' },
    { value: '3', label: 'Severity 3 (Critical)', dotColor: '#ef4444' },
    { value: '2', label: 'Severity 2 (Major)', dotColor: '#f59e0b' },
    { value: '1', label: 'Severity 1 (Minor)', dotColor: '#10b981' },
  ];

  const starOptions: SelectOption[] = [
    { value: 'all', label: 'All star ratings' },
    { value: '1', label: '1 star' },
    { value: '2', label: '2 stars' },
    { value: '3', label: '3 stars' },
  ];

  const paginatedReviews = sortedReviews.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      {/* 1. Header Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-paper border border-hairline dark:border-[#3A3C39] shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Tasks in view</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-ink tracking-tight">{stats.inView}</p>
        </div>

        <div className="p-4 rounded-2xl bg-paper border border-hairline dark:border-[#3A3C39] shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>In progress</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-amber-600 dark:text-amber-400 tracking-tight">
            {stats.inProgress}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-paper border border-hairline dark:border-[#3A3C39] shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Done</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 tracking-tight">
            {stats.done}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-paper border border-hairline dark:border-[#3A3C39] shadow-xs">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Reviews 100% completed</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-indigo-600 dark:text-indigo-400 tracking-tight">
            {stats.completedReviews}
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="relative z-20 p-4 rounded-2xl bg-paper border border-hairline dark:border-[#3A3C39] space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Text Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews, problems, Player ####..."
              className="w-full h-10 pl-10 pr-9 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#1a1c1b] border border-hairline dark:border-[#3A3C39] focus:border-ink outline-none text-ink placeholder:text-muted shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted font-medium">Sort:</span>
            <SelectMenu
              value={sortBy}
              options={sortOptions}
              onChange={(val) => setSortBy(val as 'priority' | 'newest' | 'thumbs')}
              ariaLabel="Sort reviews"
              align="right"
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="relative z-20 flex flex-wrap items-center gap-2 pt-2.5 border-t border-hairline/40 text-xs">
          <div className="flex items-center gap-1.5 text-muted font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status */}
          <SelectMenu
            value={filterStatus}
            options={statusOptions}
            onChange={setFilterStatus}
            ariaLabel="Filter by task status"
            size="sm"
          />

          {/* Theme */}
          <SelectMenu
            value={filterTheme}
            options={themeOptions}
            onChange={setFilterTheme}
            ariaLabel="Filter by issue theme"
            size="sm"
            className="max-w-[200px]"
          />

          {/* Severity */}
          <SelectMenu
            value={filterSeverity}
            options={severityOptions}
            onChange={setFilterSeverity}
            ariaLabel="Filter by issue severity"
            size="sm"
          />

          {/* Star rating */}
          <SelectMenu
            value={filterStars}
            options={starOptions}
            onChange={setFilterStars}
            ariaLabel="Filter by review stars"
            size="sm"
          />

          {/* Active Filter Clear */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-auto h-8 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters ({activeFilterCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Review Cards List */}
      <div className="space-y-4">
        {paginatedReviews.map((rev) => (
          <ReviewCard
            key={rev.id}
            review={rev}
            selectedTeam={selectedTeam}
            onStatusChangeSuccess={(msg) => setToastMessage(msg)}
            onStatusChangeError={(err) => setToastMessage(err)}
          />
        ))}

        {paginatedReviews.length === 0 && (
          <div className="text-center py-16 px-4 rounded-card border border-hairline bg-paper/60 backdrop-blur-sm">
            <AlertCircle className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="font-heading font-bold text-lg text-ink mb-1">No reviews match your filters</p>
            <p className="text-xs text-muted mb-4">Try clearing some filter criteria to expand the triage view.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-ink text-paper"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Show More Pagination */}
      {visibleCount < sortedReviews.length && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 25)}
            className="px-6 py-2.5 rounded-xl font-heading font-bold text-sm bg-paper border border-hairline text-ink shadow-sm hover:bg-canvas transition-colors"
          >
            Show more ({sortedReviews.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* 5. Toasts (Bottom-Center) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-ink text-paper shadow-2xl text-xs font-semibold flex items-center gap-2 border border-hairline/40 transition-all animate-bounce"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-paper/70 hover:text-paper"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
