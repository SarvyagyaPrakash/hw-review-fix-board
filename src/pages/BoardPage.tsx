import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { ReviewCard } from '../components/ReviewCard';
import { taskStore } from '../store/TaskStore';
import { TEAM_DISPLAY_NAMES } from '../types';
import { Search, X, Filter, AlertCircle, CheckCircle2, Clock, Layers } from 'lucide-react';

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

  const paginatedReviews = sortedReviews.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      {/* 1. Header Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-paper/70 border border-hairline/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Tasks in view</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-ink">{stats.inView}</p>
        </div>

        <div className="p-4 rounded-xl bg-paper/70 border border-hairline/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>In progress</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-amber-600 dark:text-amber-400">
            {stats.inProgress}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-paper/70 border border-hairline/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Done</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">
            {stats.done}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-paper/70 border border-hairline/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted text-xs font-medium mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Reviews 100% completed</span>
          </div>
          <p className="font-heading font-extrabold text-2xl text-indigo-600 dark:text-indigo-400">
            {stats.completedReviews}
          </p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="p-4 rounded-2xl bg-paper/85 dark:bg-[#232625]/90 border border-hairline/80 backdrop-blur-md space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Text Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews, problems, Player ####..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#191b1a] border border-hairline/80 dark:border-[#3A3C39] focus:border-ink dark:focus:border-hairline outline-none text-ink dark:text-[#ECEAE5] placeholder:text-muted shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted font-medium">Sort:</span>
            <select
              aria-label="Sort reviews"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'newest' | 'thumbs')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#191b1a] border border-hairline/80 dark:border-[#3A3C39] text-ink dark:text-[#ECEAE5] outline-none cursor-pointer shadow-2xs transition-colors"
            >
              <option value="priority" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Priority formula</option>
              <option value="newest" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Newest first</option>
              <option value="thumbs" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Most thumbs-up</option>
            </select>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline/40 text-xs">
          <div className="flex items-center gap-1.5 text-muted font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status */}
          <select
            aria-label="Filter by task status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#191b1a] border border-hairline/80 dark:border-[#3A3C39] text-ink dark:text-[#ECEAE5] outline-none cursor-pointer shadow-2xs transition-colors"
          >
            <option value="all" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">All statuses</option>
            <option value="todo" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">To do</option>
            <option value="working" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Working</option>
            <option value="done" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Done</option>
          </select>

          {/* Theme */}
          <select
            aria-label="Filter by issue theme"
            value={filterTheme}
            onChange={(e) => setFilterTheme(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#191b1a] border border-hairline/80 dark:border-[#3A3C39] text-ink dark:text-[#ECEAE5] outline-none cursor-pointer shadow-2xs transition-colors max-w-[180px] truncate"
          >
            <option value="all" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">All themes</option>
            {taxonomy?.themes.map((th) => (
              <option key={th.id} value={th.id} className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">
                {th.name}
              </option>
            ))}
          </select>

          {/* Severity */}
          <select
            aria-label="Filter by issue severity"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#191b1a] border border-hairline/80 dark:border-[#3A3C39] text-ink dark:text-[#ECEAE5] outline-none cursor-pointer shadow-2xs transition-colors"
          >
            <option value="all" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">All severities</option>
            <option value="3" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Severity 3 (Critical)</option>
            <option value="2" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Severity 2 (Major)</option>
            <option value="1" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">Severity 1 (Minor)</option>
          </select>

          {/* Star rating */}
          <select
            aria-label="Filter by review stars"
            value={filterStars}
            onChange={(e) => setFilterStars(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#191b1a] border border-hairline/80 dark:border-[#3A3C39] text-ink dark:text-[#ECEAE5] outline-none cursor-pointer shadow-2xs transition-colors"
          >
            <option value="all" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">All star ratings</option>
            <option value="1" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">1 star</option>
            <option value="2" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">2 stars</option>
            <option value="3" className="bg-white dark:bg-[#232625] text-ink dark:text-[#ECEAE5]">3 stars</option>
          </select>

          {/* Active Filter Clear */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
