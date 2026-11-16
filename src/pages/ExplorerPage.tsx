import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { taskStore } from '../store/TaskStore';
import { TEAM_DISPLAY_NAMES } from '../types';
import { Search, Download, Star, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

export const ExplorerPage: React.FC = () => {
  const { reviews, taxonomy } = useData();

  // Filters
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [actionableFilter, setActionableFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Row Expand State
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesText = r.text.toLowerCase().includes(q);
        const matchesAlias = r.alias.toLowerCase().includes(q);
        if (!matchesText && !matchesAlias) return false;
      }

      if (starFilter !== 'all' && r.stars !== parseInt(starFilter, 10)) {
        return false;
      }

      if (themeFilter !== 'all') {
        if (!r.issues.some((i) => i.theme === themeFilter)) return false;
      }

      if (actionableFilter !== 'all') {
        const isAct = actionableFilter === 'yes';
        if (r.actionable !== isAct) return false;
      }

      return true;
    });
  }, [reviews, search, starFilter, themeFilter, actionableFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageReviews = filteredReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Safe CSV Export with Formula Injection Guard
  const handleExportCSV = () => {
    const sanitize = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Guard against CSV formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'id',
      'alias',
      'stars',
      'date',
      'version',
      'thumbs',
      'actionable',
      'themes',
      'teams',
      'text',
      'team_statuses',
    ];

    const rows = filteredReviews.map((r) => {
      const themesStr = r.issues.map((i) => i.theme).join('; ');
      const teamsStr = r.teams.map((t) => TEAM_DISPLAY_NAMES[t.team]).join('; ');
      const statusStr = r.teams
        .map((t) => `${TEAM_DISPLAY_NAMES[t.team]}: ${taskStore.getStatus(r.id, t.team)}`)
        .join('; ');

      return [
        sanitize(r.id),
        sanitize(r.alias),
        sanitize(r.stars),
        sanitize(r.date),
        sanitize(r.version || ''),
        sanitize(r.thumbs),
        sanitize(r.actionable ? 'Yes' : 'No'),
        sanitize(themesStr),
        sanitize(teamsStr),
        sanitize(r.text),
        sanitize(statusStr),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hw_reviews_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline/80">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
            Review Explorer
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Browse, filter, and inspect all {reviews.length.toLocaleString('en-IN')} cleaned player reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-paper border border-hairline text-ink hover:bg-canvas transition-colors shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV ({filteredReviews.length.toLocaleString('en-IN')} rows)</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-xl bg-paper/85 border border-hairline backdrop-blur-md flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search text or Player alias..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-canvas/40 border border-hairline text-ink outline-none focus:border-ink"
          />
        </div>

        {/* Stars */}
        <select
          value={starFilter}
          onChange={(e) => {
            setStarFilter(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-canvas/40 border border-hairline text-ink outline-none cursor-pointer"
        >
          <option value="all">All Stars</option>
          <option value="1">1 Star</option>
          <option value="2">2 Stars</option>
          <option value="3">3 Stars</option>
        </select>

        {/* Theme */}
        <select
          value={themeFilter}
          onChange={(e) => {
            setThemeFilter(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-canvas/40 border border-hairline text-ink outline-none cursor-pointer max-w-[180px] truncate"
        >
          <option value="all">All Themes</option>
          {taxonomy?.themes.map((th) => (
            <option key={th.id} value={th.id}>
              {th.name}
            </option>
          ))}
        </select>

        {/* Actionable */}
        <select
          value={actionableFilter}
          onChange={(e) => {
            setActionableFilter(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-canvas/40 border border-hairline text-ink outline-none cursor-pointer"
        >
          <option value="all">All Actionable</option>
          <option value="yes">Actionable only</option>
          <option value="no">Non-actionable only</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-hairline bg-paper/85 overflow-hidden shadow-xs backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas/50 border-b border-hairline text-muted uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Rating</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Thumbs</th>
                <th className="py-3 px-3">Themes</th>
                <th className="py-3 px-4">Review Text Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/60">
              {pageReviews.map((r) => {
                const isExpanded = !!expandedRows[r.id];
                return (
                  <tr key={r.id} className="hover:bg-canvas/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">{r.alias}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-semibold text-amber-500">
                        {r.stars} <Star className="w-3 h-3 fill-current" />
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted whitespace-nowrap">{r.date || '—'}</td>
                    <td className="py-3 px-3 text-muted whitespace-nowrap">{r.version ? `v${r.version}` : '—'}</td>
                    <td className="py-3 px-3 text-muted whitespace-nowrap">{r.thumbs}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {r.issues.map((i, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-canvas border border-hairline font-medium text-ink"
                          >
                            {i.theme.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {r.issues.length === 0 && <span className="text-muted italic text-[11px]">none</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="text-ink text-xs font-sans leading-relaxed">
                        {isExpanded || r.text.length <= 120 ? r.text : `${r.text.slice(0, 120)}…`}
                      </p>
                      {r.text.length > 120 && (
                        <button
                          type="button"
                          onClick={() => toggleRow(r.id)}
                          className="text-[11px] text-muted hover:text-ink font-semibold mt-1 inline-flex items-center gap-0.5"
                        >
                          {isExpanded ? 'Less' : 'More'}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pageReviews.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted text-xs">
                    No reviews match the chosen filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-canvas/30 border-t border-hairline flex items-center justify-between text-xs text-muted">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredReviews.length)} of{' '}
            {filteredReviews.length.toLocaleString('en-IN')} reviews
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-hairline bg-paper disabled:opacity-40 hover:bg-canvas"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-ink">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-hairline bg-paper disabled:opacity-40 hover:bg-canvas"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
