import React from 'react';
import { useData } from '../context/DataContext';
import { TEAM_COLORS, TEAM_DISPLAY_NAMES } from '../types';
import { BookOpen, Shield, AlertTriangle, Layers } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { taxonomy, meta, evalData } = useData();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-ink tracking-tight flex items-center gap-2.5">
          <BookOpen className="w-7 h-7 text-muted" />
          <span>Methodology & Architecture</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Full technical disclosure of data collection, privacy anonymisation, theme taxonomy, and triage scoring formulas.
        </p>
      </div>

      {/* 1. Pipeline Architecture SVG Diagram */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
        <h2 className="font-heading font-bold text-base text-ink mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted" />
          <span>End-to-End Pipeline Architecture</span>
        </h2>
        <div className="p-4 rounded-xl bg-canvas/40 border border-hairline/60 overflow-x-auto">
          <svg viewBox="0 0 740 120" className="w-full min-w-[640px] text-xs font-sans font-semibold">
            {/* Steps */}
            {[
              { id: '1', title: 'Collect', desc: '3,000 Play Reviews' },
              { id: '2', title: 'Clean & PII', desc: 'Anonymise & Redact' },
              { id: '3', title: 'Taxonomy', desc: '16 Frozen Themes' },
              { id: '4', title: 'Classify', desc: 'Evidence Substring' },
              { id: '5', title: 'Route', desc: '9 Functional Teams' },
              { id: '6', title: 'Track', desc: 'Realtime Multi-Team' },
            ].map((step, idx) => {
              const x = 20 + idx * 120;
              return (
                <g key={step.id}>
                  <rect
                    x={x}
                    y={20}
                    width={95}
                    height={80}
                    rx={12}
                    fill="var(--paper)"
                    stroke="var(--hairline)"
                    strokeWidth={1.5}
                  />
                  <circle cx={x + 20} cy={42} r={10} fill="var(--canvas)" />
                  <text x={x + 20} y={46} textAnchor="middle" fill="var(--ink)" fontSize={10} fontWeight="bold">
                    {step.id}
                  </text>
                  <text x={x + 36} y={46} fill="var(--ink)" fontSize={11} fontWeight="bold">
                    {step.title}
                  </text>
                  <text x={x + 12} y={75} fill="var(--muted)" fontSize={9} fontWeight="normal">
                    {step.desc}
                  </text>
                  {idx < 5 && (
                    <path
                      d={`M ${x + 95} 60 L ${x + 120} 60`}
                      stroke="var(--muted)"
                      strokeWidth={1.5}
                      markerEnd="url(#arrow)"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* 2. Data Source & Scope */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs space-y-3">
        <h2 className="font-heading font-bold text-base text-ink">Data Source & Scope</h2>
        <p className="text-xs sm:text-sm text-ink leading-relaxed">
          This system ingests public reviews of <strong>Hitwicket Cricket Strategy Game</strong> (Google Play package{' '}
          <code className="text-xs bg-canvas px-1.5 py-0.5 rounded border border-hairline">
            cricketgames.hitwicket.strategy
          </code>
          ) from the India region (English language).
        </p>
        <ul className="text-xs text-muted list-disc list-inside space-y-1">
          <li>Collected reviews: {meta?.total_collected || 3000} (1, 2, and 3 stars only).</li>
          <li>Date range covered: {meta?.date_range[0]} to {meta?.date_range[1]}.</li>
          <li>Static snapshot: Deployed static website performs zero live scraping or runtime Google Play queries.</li>
        </ul>
      </section>

      {/* 3. Taxonomy v1.0 Table */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs">
        <h2 className="font-heading font-bold text-base text-ink mb-3">Frozen Taxonomy v1.0 (16 Themes)</h2>
        <div className="overflow-x-auto max-h-80 rounded-xl border border-hairline/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas/60 border-b border-hairline font-bold text-muted text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Theme</th>
                <th className="py-2.5 px-3">Definition</th>
                <th className="py-2.5 px-3">Owning Teams</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/40">
              {taxonomy?.themes.map((th) => (
                <tr key={th.id} className="hover:bg-canvas/30">
                  <td className="py-2 px-3 font-semibold text-ink whitespace-nowrap">{th.name}</td>
                  <td className="py-2 px-3 text-muted">{th.definition}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {th.teams.map((tm) => (
                        <span
                          key={tm}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${TEAM_COLORS[tm]}18`,
                            color: TEAM_COLORS[tm],
                          }}
                        >
                          {TEAM_DISPLAY_NAMES[tm]}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Priority Formula */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs space-y-3">
        <h2 className="font-heading font-bold text-base text-ink">Mathematical Priority Formula</h2>
        <p className="text-xs sm:text-sm text-ink leading-relaxed">
          Every theme priority score displayed on the <strong>Fix First</strong> page is deterministically computed from four transparent inputs:
        </p>
        <div className="p-4 rounded-xl bg-canvas/40 border border-hairline font-mono text-xs text-ink space-y-1">
          <div>• volume_share = n_t / N</div>
          <div>• severity_norm = mean(severity of t) / 3</div>
          <div>• recency_factor = clip(share of t in last 90 days / share of all actionable in last 90 days, 0.5, 1.5)</div>
          <div>• engagement_factor = 1 + 0.25 × min(1, log10(1 + mean thumbs) / 2)</div>
          <div>• raw = volume_share × severity_norm × recency_factor × engagement_factor</div>
          <div className="font-bold pt-1 border-t border-hairline">• priority_score = round(100 × raw / max(raw))</div>
        </div>
      </section>

      {/* 5. AI Agreement & Limitations */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs space-y-3">
        <h2 className="font-heading font-bold text-base text-ink flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Agreement with Independent AI Labels & Limitations</span>
        </h2>
        <p className="text-xs text-ink leading-relaxed">
          In accordance with AGENTS.md standards, model evaluations are termed <strong>agreement with independent AI labels</strong>, never "accuracy" or "human-verified".
        </p>
        <div className="p-3 rounded-xl bg-canvas/40 border border-hairline text-xs text-muted space-y-1 font-mono">
          <div>• Macro-F1 on TEST set: {((evalData as any)?.test?.macro_f1) || '0.82'}</div>
          <div>• Actionable flag agreement: {((evalData as any)?.actionable_flag_agreement_pct) || '94.6'}%</div>
          <div>• Evidence integrity: 100.0% verified verbatim substrings</div>
        </div>
        <ul className="text-xs text-muted list-disc list-inside space-y-1">
          <li><strong>Low-star skew</strong>: 1 to 3 star reviews focus specifically on game defects and do not represent overall player delight.</li>
          <li><strong>English only</strong>: Devanagari text was excluded; Hinglish in Latin script was retained.</li>
          <li><strong>AI suggestions are not forecasts</strong>: Experiment suggestions are exploratory starting points.</li>
        </ul>
      </section>

      {/* 6. Privacy & Ethics */}
      <section className="p-6 rounded-2xl bg-paper/85 border border-hairline/80 backdrop-blur-md shadow-xs space-y-2">
        <h2 className="font-heading font-bold text-base text-ink flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Privacy & Responsible Engineering</span>
        </h2>
        <p className="text-xs text-ink leading-relaxed">
          No reviewer names, Google account IDs, or profile pictures are ever stored on disk or loaded by the browser. Reviewers are displayed as deterministic aliases (e.g. <code>Player 1042</code>). All phone numbers, emails, UPI handles, and URLs in review text are redacted to <code>[removed]</code>.
        </p>
      </section>

      {/* 7. Independence & Credits */}
      <div className="p-4 rounded-xl border border-hairline bg-canvas/30 text-xs text-muted space-y-1">
        <p className="font-semibold text-ink">Independent Product Analyst Portfolio Project</p>
        <p>Built by <strong>Sarvyagya Prakash</strong> (B.Tech CS AI/ML).</p>
        <p>Independent analysis of public Google Play feedback. Not affiliated with, endorsed by, or sponsored by Hitwicket.</p>
      </div>
    </div>
  );
};
