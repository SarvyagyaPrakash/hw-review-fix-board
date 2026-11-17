import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { TEAM_COLORS, TEAM_DISPLAY_NAMES } from '../types';
import { Printer, Copy, Check, Info, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

export const FixFirstPage: React.FC = () => {
  const { insights, reviews, experiments } = useData();
  const [copied, setCopied] = useState(false);
  const [activeFormulaPopover, setActiveFormulaPopover] = useState<string | null>(null);

  useEffect(() => {
    const handleOutside = () => setActiveFormulaPopover(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveFormulaPopover(null);
    };
    if (activeFormulaPopover) {
      window.addEventListener('click', handleOutside);
      window.addEventListener('keydown', handleKey);
    }
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [activeFormulaPopover]);

  const topThemes = useMemo(() => {
    if (!insights) return [];
    return insights.priority_rankings.slice(0, 3);
  }, [insights]);

  // Find 3 top evidence quotes per theme (sorted by thumbs, then severity)
  const topEvidenceByTheme = useMemo(() => {
    const map: Record<string, { alias: string; quote: string; thumbs: number }[]> = {};
    topThemes.forEach((t) => {
      const matchingReviews = reviews.filter((r) =>
        r.issues.some((iss) => iss.theme === t.theme)
      );

      // Sort by thumbs desc
      matchingReviews.sort((a, b) => b.thumbs - a.thumbs);

      const quotes: { alias: string; quote: string; thumbs: number }[] = [];
      for (const r of matchingReviews) {
        const iss = r.issues.find((i) => i.theme === t.theme);
        if (iss && iss.evidence) {
          quotes.push({
            alias: r.alias,
            quote: iss.evidence,
            thumbs: r.thumbs,
          });
        }
        if (quotes.length >= 3) break;
      }
      map[t.theme] = quotes;
    });
    return map;
  }, [topThemes, reviews]);

  // Compute template statements
  const statementsByTheme = useMemo(() => {
    const map: Record<string, string> = {};
    if (!insights) return map;
    const totalAct = insights.actionable_reviews || 1;

    topThemes.forEach((t) => {
      const themeReviews = reviews.filter((r) =>
        r.issues.some((iss) => iss.theme === t.theme)
      );
      const oneStarReviews = themeReviews.filter((r) => r.stars === 1).length;
      const allOneStar = reviews.filter((r) => r.stars === 1 && r.actionable).length || 1;

      const actPct = Math.round((t.volume_count / totalAct) * 100);
      const starPct = Math.round((oneStarReviews / allOneStar) * 100);

      map[t.theme] = `${t.name} appears in ${actPct}% of actionable reviews and ${starPct}% of 1-star complaints.`;
    });
    return map;
  }, [topThemes, reviews, insights]);

  // Copy Plain Text Summary
  const handleCopyText = () => {
    if (!topThemes.length) return;
    let text = `HW Review-Fix Board: Top 3 Fix Priorities\n`;
    text += `Generated: ${new Date().toLocaleDateString('en-IN')}\n\n`;

    topThemes.forEach((t, idx) => {
      const expKey = `${t.theme}|${t.primary_team}`;
      const exp = experiments[expKey];
      text += `${idx + 1}. ${t.name.toUpperCase()} (Priority Score: ${t.priority_score}/100 | Confidence: ${t.confidence})\n`;
      text += `   - Owning Team: ${TEAM_DISPLAY_NAMES[t.primary_team]}\n`;
      text += `   - Volume: ${t.volume_count} reviews (${statementsByTheme[t.theme]})\n`;
      if (exp) {
        text += `   - Recommended Experiment: ${exp.experiment}\n`;
        text += `   - Metric to Watch: ${exp.metric} (${exp.metric_note})\n`;
      }
      const quotes = topEvidenceByTheme[t.theme] || [];
      if (quotes.length) {
        text += `   - Top Evidence: "${quotes[0].quote}" (${quotes[0].alias})\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!insights) {
    return (
      <div className="py-12 text-center text-xs text-muted">
        Loading priority calculations...
      </div>
    );
  }

  return (
    <div className="print-page max-w-4xl mx-auto space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline/80">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-ink tracking-tight">
            Fix First
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Top three highest-priority fixes scored by volume, severity, recency, and player engagement.
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={handleCopyText}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold bg-paper/70 dark:bg-[#1e201f]/75 border border-hairline/80 dark:border-white/10 backdrop-blur-md text-ink dark:text-[#ECEAE5] hover:bg-paper/90 dark:hover:bg-[#1e201f]/90 transition-all shadow-2xs active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
            <span>{copied ? 'Copied' : 'Copy as text'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl text-xs font-semibold bg-ink text-paper hover:opacity-90 active:scale-95 transition-all shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      {/* Top 3 Priority Cards */}
      <div className="space-y-6">
        {topThemes.map((item, idx) => {
          const primaryColor = TEAM_COLORS[item.primary_team];
          const expKey = `${item.theme}|${item.primary_team}`;
          const exp = experiments[expKey];
          const quotes = topEvidenceByTheme[item.theme] || [];
          const statement = statementsByTheme[item.theme];

          return (
            <section
              key={item.theme}
              className="p-6 rounded-2xl bg-paper/90 border border-hairline/80 shadow-sm relative backdrop-blur-md"
              style={{ borderLeft: `6px solid ${primaryColor}` }}
            >
              {/* Card Top: Rank, Title, Score & Confidence */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-ink text-paper font-heading font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-ink tracking-tight">
                      {item.name}
                    </h2>
                  </div>
                  <p className="text-xs text-muted font-medium">{statement}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Confidence Badge */}
                  <div
                    title={`Confidence: ${item.confidence} (n=${item.volume_count}, agreement F1=${item.agreement_f1})`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      item.confidence === 'High'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : item.confidence === 'Medium'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{item.confidence} confidence</span>
                  </div>

                  {/* Priority Score Popover Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFormulaPopover(
                          activeFormulaPopover === item.theme ? null : item.theme
                        );
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas text-ink font-heading font-black text-sm border border-hairline hover:bg-hairline/60 transition-colors"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-muted" />
                      <span>Score: {item.priority_score}</span>
                      <Info className="w-3.5 h-3.5 text-muted ml-0.5" />
                    </button>

                    {/* Mathematical Formula Explanation Popover */}
                    {activeFormulaPopover === item.theme && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-2 w-80 p-4 rounded-xl bg-paper border border-hairline shadow-2xl z-40 text-xs text-ink space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <div className="flex justify-between items-center font-bold text-ink border-b border-hairline/60 pb-1.5">
                          <span>Priority Scoring Working</span>
                          <button
                            type="button"
                            onClick={() => setActiveFormulaPopover(null)}
                            className="text-muted hover:text-ink"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-muted text-[11px] leading-tight">
                          Priority = round(100 × raw / max_raw), where:
                        </p>
                        <div className="font-mono text-[11px] space-y-1 bg-canvas/40 p-2.5 rounded-lg border border-hairline/60">
                          <div>Volume Share: {item.volume_share} (n={item.volume_count})</div>
                          <div>Severity Norm: {item.severity_norm}</div>
                          <div>Recency Factor: {item.recency_factor}</div>
                          <div>Engagement Factor: {item.engagement_factor}</div>
                          <div className="pt-1 border-t border-hairline font-bold text-ink">
                            Raw Score: {item.raw_score}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted italic">
                          Confidence is {item.confidence} based on n={item.volume_count} and AI agreement F1={item.agreement_f1}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Owning Teams Chips */}
              <div className="flex items-center gap-2 mb-4 text-xs">
                <span className="text-muted font-semibold">Owning teams:</span>
                <div className="flex flex-wrap gap-1.5">
                  {item.teams.map((tm) => {
                    const c = TEAM_COLORS[tm];
                    return (
                      <span
                        key={tm}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${c}18`,
                          color: c,
                          border: `1px solid ${c}66`,
                        }}
                      >
                        {TEAM_DISPLAY_NAMES[tm]}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Recommended Experiment Box */}
              {exp && (
                <div className="p-4 rounded-xl bg-canvas/40 border border-hairline/60 mb-4 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted">
                      Recommended Experiment ({TEAM_DISPLAY_NAMES[item.primary_team]})
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI-suggested
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink leading-snug">{exp.experiment}</p>
                  <div className="text-xs text-muted pt-1">
                    <span>Metric to watch: </span>
                    <strong className="text-ink underline decoration-dotted">{exp.metric}</strong>
                    <span className="ml-1">({exp.metric_note})</span>
                  </div>
                </div>
              )}

              {/* Verbatim Evidence Quotes */}
              <div>
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-muted block mb-2">
                  Player Evidence ({quotes.length} verified quotes)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {quotes.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-3 rounded-lg bg-paper border border-hairline/60 flex flex-col justify-between text-xs"
                    >
                      <blockquote className="italic text-ink font-sans mb-2 leading-relaxed">
                        “{q.quote}”
                      </blockquote>
                      <div className="flex items-center justify-between text-[11px] text-muted font-medium pt-2 border-t border-hairline/30">
                        <span>{q.alias}</span>
                        {q.thumbs > 0 && <span>{q.thumbs} helpful</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
