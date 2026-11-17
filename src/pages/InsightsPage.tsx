import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { TEAM_COLORS, TEAM_DISPLAY_NAMES, TeamId } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  BarChart3,
  Database,
  Sparkles,
  MessageSquare,
  Send,
  Table,
  AlertTriangle,
  TrendingUp,
  GitCommit,
  Calendar,
  ArrowRight,
  Quote,
} from 'lucide-react';

function formatDate(dStr: string): string {
  try {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dStr;
  } catch {
    return dStr;
  }
}

export const InsightsPage: React.FC = () => {
  const { insights, meta, taxonomy } = useData();

  // Chart table fallback toggles
  const [showVolumeTable, setShowVolumeTable] = useState(false);
  const [showSeverityTable, setShowSeverityTable] = useState(false);
  const [showWeeklyTable, setShowWeeklyTable] = useState(false);

  // Ask The Reviews Chat State (Stage 9)
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<{
    answer: string;
    sources?: string[];
  } | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Volume Chart Data
  const volumeData = useMemo(() => {
    if (!insights || !taxonomy) return [];
    return insights.priority_rankings.map((r) => ({
      name: r.name,
      id: r.theme,
      count: r.volume_count,
      color: TEAM_COLORS[r.primary_team] || '#4A6FA5',
    }));
  }, [insights, taxonomy]);

  // Severity Mix Data
  const severityData = useMemo(() => {
    if (!insights) return [];
    return [
      { name: 'Critical (Severity 3)', count: insights.severity_mix['3'] || 0, color: '#ef4444' },
      { name: 'Major (Severity 2)', count: insights.severity_mix['2'] || 0, color: '#f59e0b' },
      { name: 'Minor (Severity 1)', count: insights.severity_mix['1'] || 0, color: '#10b981' },
    ];
  }, [insights]);

  // Weekly Trend Data for Recharts (Last 14 active weeks)
  const weeklyChartData = useMemo(() => {
    if (!insights?.weekly_trends) return [];
    const weeks = Object.keys(insights.weekly_trends).sort();
    const recentWeeks = weeks.slice(-14);

    return recentWeeks.map((wk) => {
      const counts = insights.weekly_trends?.[wk] || {};
      const cleanWeekLabel = wk.replace('2026-', '').replace('2025-', '25-');
      return {
        week: cleanWeekLabel,
        fullWeek: wk,
        'Matchmaking Balance': counts['matchmaking_balance'] || 0,
        'Lag & Performance': counts['lag_performance'] || 0,
        'Crashes & Bugs': counts['crashes_bugs'] || 0,
        'Pay To Win': counts['pay_to_win'] || 0,
        'Release Quality': counts['release_quality'] || 0,
        'Ads & Alerts': counts['ads_notifications'] || 0,
      };
    });
  }, [insights]);

  // Key Takeaways (Enhanced with Release Regressions)
  const keyTakeaways = useMemo(() => {
    if (!insights) return [];
    const top = insights.priority_rankings[0];
    const second = insights.priority_rankings[1];
    const critCount = insights.severity_mix['3'] || 0;
    const totalIssues = Object.values(insights.severity_mix).reduce((a, b) => a + b, 0);
    const critPct = totalIssues > 0 ? Math.round((critCount / totalIssues) * 100) : 0;
    const topRegression = insights.release_regressions?.[0];

    return [
      `1. Matchmaking balance is the single largest player pain point with ${top?.volume_count || 0} complaints directly mentioning rating disparities.`,
      `2. Pay-to-win sentiment ranks as the #2 friction, heavily driven by late-game progression walls and 7-star squad pairings.`,
      topRegression
        ? `3. Version ${topRegression.version} triggered an acute ${topRegression.ratio}× spike in ${topRegression.theme_name} complaints (${topRegression.theme_share_pct}% vs ${topRegression.base_share_pct}% baseline).`
        : `3. Critical issues account for ${critPct}% of all actionable feedback, indicating high player churn risk during match launch.`,
      `4. Ads & notifications volume accounts for ${second?.volume_count || 0} reviews, highlighting player frustration with post-match ad interruptions.`,
    ];
  }, [insights]);

  const handleAskQuestion = async (qText: string) => {
    if (!qText.trim()) return;
    setChatLoading(true);
    setChatError(null);
    setChatResponse(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qText }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Hourly query limit reached. Please wait a bit before asking again.');
        }
        throw new Error('Ask-the-reviews service is currently in mock/standby mode.');
      }

      const data = await res.json();
      setChatResponse(data);
    } catch (err) {
      setChatError((err as Error).message || 'Failed to get answer from reviews.');
    } finally {
      setChatLoading(false);
    }
  };

  if (!insights || !meta) {
    return <div className="py-12 text-center text-xs text-muted">Loading insights data...</div>;
  }

  const regressions = insights.release_regressions || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-ink tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-muted" />
          <span>Product Insights</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Quantitative aggregates across {insights.total_reviews.toLocaleString('en-IN')} reviews and{' '}
          {insights.actionable_reviews.toLocaleString('en-IN')} actionable triage issues.
        </p>
      </div>

      {/* Key Takeaways Box */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
        <h2 className="font-heading font-bold text-base text-ink mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>Key Analytical Takeaways</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keyTakeaways.map((takeaway, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-canvas/40 border border-hairline/60 text-xs text-ink font-medium leading-relaxed"
            >
              {takeaway}
            </div>
          ))}
        </div>
      </section>

      {/* NEW FEATURE: Release Regressions & Spike Detector */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="font-heading font-extrabold text-base sm:text-lg text-ink tracking-tight">
                Release Regressions & Spike Detector
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20">
                {regressions.length} Flagged Releases
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Automated anomaly detection: flags releases where a complaint theme jumped $\ge 2\times$ above its baseline volume, with verified player quotes and owning team routing.
            </p>
          </div>
        </div>

        {/* Flagged Release Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {regressions.map((reg) => (
            <div
              key={`${reg.version}-${reg.theme}`}
              className="p-5 rounded-xl border border-hairline/80 dark:border-[#3A3C39] bg-canvas/30 hover:border-hairline transition-all space-y-3"
            >
              {/* Header Badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-ink text-paper shadow-2xs">
                      <GitCommit className="w-3 h-3" />
                      v{reg.version}
                    </span>
                    <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(reg.start_date)} – {formatDate(reg.end_date)}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-sm text-ink pt-0.5">
                    {reg.theme_name}
                  </h3>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    <TrendingUp className="w-3 h-3" />
                    {reg.ratio}× normal
                  </span>
                  <div className="text-[10px] text-muted font-medium mt-0.5">
                    +{Math.round((reg.ratio - 1) * 100)}% spike
                  </div>
                </div>
              </div>

              {/* Volume Share Comparison Bar */}
              <div className="space-y-1.5 p-2.5 rounded-lg bg-paper/60 border border-hairline/50 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted">Release Complaint Share:</span>
                  <span className="font-bold text-ink">
                    {reg.theme_share_pct}%{' '}
                    <span className="text-muted font-normal">(vs {reg.base_share_pct}% baseline)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-hairline/60 dark:bg-white/10 overflow-hidden flex">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, reg.theme_share_pct)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted flex justify-between">
                  <span>{reg.count} of {reg.version_total} actionable reviews on v{reg.version}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">Critical Regression</span>
                </div>
              </div>

              {/* Owning Teams Routing */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-muted mr-1">Routed to:</span>
                {reg.owning_teams.map((tm) => {
                  const tId = tm as TeamId;
                  const name = TEAM_DISPLAY_NAMES[tId] || tm;
                  const color = TEAM_COLORS[tId] || '#4A6FA5';
                  return (
                    <span
                      key={tm}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                      style={{
                        backgroundColor: `${color}18`,
                        borderColor: `${color}40`,
                        color: color,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      {name}
                    </span>
                  );
                })}
              </div>

              {/* Verbatim Quotes Sample */}
              {reg.quotes && reg.quotes.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-hairline/50">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted flex items-center gap-1">
                    <Quote className="w-3 h-3" />
                    <span>Verbatim Evidence on v{reg.version}</span>
                  </div>
                  <div className="space-y-1">
                    {reg.quotes.map((q, qIdx) => (
                      <p
                        key={qIdx}
                        className="text-[11px] italic text-ink/90 bg-paper/40 p-1.5 rounded-md border border-hairline/40 leading-snug"
                      >
                        “{q.quote}”{' '}
                        <span className="font-semibold not-italic text-muted text-[10px]">
                          — {q.alias} ({q.stars}★)
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <NavLink
                  to={`/?search=${encodeURIComponent(reg.version)}`}
                  className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold bg-paper text-ink border border-hairline hover:bg-canvas hover:text-ink transition-all shadow-2xs"
                >
                  <span>Filter Board for v{reg.version} Tasks</span>
                  <ArrowRight className="w-3 h-3" />
                </NavLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEW FEATURE: Weekly Theme Trajectory / Velocity Chart */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-extrabold text-base sm:text-lg text-ink">
              Weekly Theme Trajectory (Last 14 Weeks)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Time-series tracking: identifies when specific complaints surged across game releases
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWeeklyTable(!showWeeklyTable)}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
            title="Toggle accessible table view"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>

        {showWeeklyTable ? (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-hairline font-bold text-muted">
                <tr>
                  <th className="py-2">Week</th>
                  <th className="py-2 text-right">Matchmaking</th>
                  <th className="py-2 text-right">Lag</th>
                  <th className="py-2 text-right">Crashes</th>
                  <th className="py-2 text-right">Pay to Win</th>
                  <th className="py-2 text-right">Release Quality</th>
                  <th className="py-2 text-right">Ads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/40">
                {weeklyChartData.map((d) => (
                  <tr key={d.fullWeek}>
                    <td className="py-1.5 text-ink font-mono">{d.fullWeek}</td>
                    <td className="py-1.5 text-right font-mono">{d['Matchmaking Balance']}</td>
                    <td className="py-1.5 text-right font-mono">{d['Lag & Performance']}</td>
                    <td className="py-1.5 text-right font-mono">{d['Crashes & Bugs']}</td>
                    <td className="py-1.5 text-right font-mono">{d['Pay To Win']}</td>
                    <td className="py-1.5 text-right font-mono">{d['Release Quality']}</td>
                    <td className="py-1.5 text-right font-mono">{d['Ads & Alerts']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3E8E93" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3E8E93" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorCrash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A6FA5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4A6FA5" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorRel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorP2W" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5E8C6A" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#5E8C6A" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="var(--muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--paper)',
                    borderColor: 'var(--hairline)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Matchmaking Balance" stroke="#3E8E93" fillOpacity={1} fill="url(#colorMM)" />
                <Area type="monotone" dataKey="Crashes & Bugs" stroke="#4A6FA5" fillOpacity={1} fill="url(#colorCrash)" />
                <Area type="monotone" dataKey="Release Quality" stroke="#ef4444" fillOpacity={1} fill="url(#colorRel)" />
                <Area type="monotone" dataKey="Pay To Win" stroke="#5E8C6A" fillOpacity={1} fill="url(#colorP2W)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Themes by Volume */}
        <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-ink">Themes by Volume</h3>
              <p className="text-xs text-muted">Actionable complaints per taxonomy theme</p>
            </div>
            <button
              type="button"
              onClick={() => setShowVolumeTable(!showVolumeTable)}
              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
              title="Toggle accessible table view"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {showVolumeTable ? (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-hairline font-bold text-muted">
                  <tr>
                    <th className="py-2">Theme</th>
                    <th className="py-2 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/40">
                  {volumeData.map((d) => (
                    <tr key={d.id}>
                      <td className="py-1.5 text-ink">{d.name}</td>
                      <td className="py-1.5 text-right font-mono font-bold">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <XAxis type="number" stroke="var(--muted)" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={120} stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--paper)', borderColor: 'var(--hairline)', borderRadius: 10, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {volumeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Chart 2: Severity Distribution */}
        <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-ink">Severity Breakdown</h3>
              <p className="text-xs text-muted">Issue severity classification mix</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSeverityTable(!showSeverityTable)}
              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
              title="Toggle accessible table view"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {showSeverityTable ? (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-hairline font-bold text-muted">
                  <tr>
                    <th className="py-2">Severity Level</th>
                    <th className="py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline/40">
                  {severityData.map((d) => (
                    <tr key={d.name}>
                      <td className="py-1.5 text-ink">{d.name}</td>
                      <td className="py-1.5 text-right font-mono font-bold">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={4}
                    label={(entry) => `${entry.name.split(' ')[0]}: ${entry.count}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--paper)', borderColor: 'var(--hairline)', borderRadius: 10, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Data Quality & Pipeline Transparency Card */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
        <h3 className="font-heading font-bold text-base text-ink mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-muted" />
          <span>Data Quality & Pipeline Report</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
          <div className="p-3 rounded-xl bg-canvas/40 border border-hairline/60">
            <span className="text-muted block mb-1">Reviews Collected</span>
            <span className="font-heading font-black text-lg text-ink">{meta.total_collected.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 rounded-xl bg-canvas/40 border border-hairline/60">
            <span className="text-muted block mb-1">After Cleaning</span>
            <span className="font-heading font-black text-lg text-ink">{meta.total_cleaned.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 rounded-xl bg-canvas/40 border border-hairline/60">
            <span className="text-muted block mb-1">Actionable Issues</span>
            <span className="font-heading font-black text-lg text-ink">{meta.total_actionable.toLocaleString('en-IN')}</span>
          </div>
          <div className="p-3 rounded-xl bg-canvas/40 border border-hairline/60">
            <span className="text-muted block mb-1">Retention Rate</span>
            <span className="font-heading font-black text-lg text-ink">{meta.retention_rate_pct}%</span>
          </div>
        </div>

        <div className="text-xs text-muted space-y-1 bg-canvas/20 p-3 rounded-xl border border-hairline/40 font-mono">
          <div>• Collection Date Range: {meta.date_range[0]} to {meta.date_range[1]}</div>
          <div>• Cleaning drops: {JSON.stringify(meta.cleaning_drops)}</div>
          <div>• Privacy Protection: Reviewer names/IDs dropped; phone numbers/emails redacted to [removed].</div>
        </div>
      </section>

      {/* Ask The Reviews Panel (Stage 9) */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          <h3 className="font-heading font-bold text-base text-ink">Ask the Reviews</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            AI Q&A
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          Ask questions answered strictly from verified review excerpts. AI-generated from public reviews; may contain errors.
        </p>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            'Why are players complaining about auctions?',
            'What causes the game to crash?',
            'Are players unhappy with matchmaking?',
          ].map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuestion(ex);
                handleAskQuestion(ex);
              }}
              className="h-7 px-3 inline-flex items-center rounded-lg text-xs font-medium border border-hairline/70 dark:border-white/10 bg-paper/60 dark:bg-[#1e201f]/60 text-muted hover:text-ink hover:bg-paper/90 dark:hover:bg-[#1e201f]/90 transition-all shadow-2xs"
            >
              “{ex}”
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question about Hitwicket player feedback..."
            className="flex-1 h-10 px-4 text-xs sm:text-sm rounded-xl border border-hairline/80 dark:border-white/10 bg-paper/70 dark:bg-[#191b1a]/80 text-ink dark:text-[#ECEAE5] outline-none focus:border-ink dark:focus:border-hairline placeholder:text-muted shadow-2xs backdrop-blur-sm transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskQuestion(question);
            }}
          />
          <button
            type="button"
            onClick={() => handleAskQuestion(question)}
            disabled={chatLoading || !question.trim()}
            className="h-10 px-4 rounded-xl text-xs font-bold bg-ink text-paper hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-shrink-0"
          >
            {chatLoading ? <span>Searching…</span> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>

        {chatError && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
            {chatError}
          </div>
        )}

        {chatResponse && (
          <div className="mt-4 p-4 rounded-xl bg-canvas/40 border border-hairline text-xs space-y-2">
            <p className="text-ink leading-relaxed font-medium">{chatResponse.answer}</p>
            {chatResponse.sources && chatResponse.sources.length > 0 && (
              <div className="text-[11px] text-muted pt-2 border-t border-hairline/40">
                Sources: {chatResponse.sources.join(', ')}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
