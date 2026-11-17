# Architecture Decision Records (DECISIONS.md)

This log documents all architectural decisions, alternatives considered, and justifications for **HW Review-Fix Board**.

---

### 1. Choice of LLM Provider: Groq
- **Date**: 2026-11-16
- **Decision**: Use Groq (`https://api.groq.com/openai/v1`) with model `qwen/qwen3.8-27b` as the OpenAI-compatible inference engine instead of xAI.
- **Alternative**: xAI Grok or OpenAI directly.
- **Reason**: The user provided a Groq API key. Groq provides ultra-fast inference throughput with native OpenAI client compatibility and structured JSON object formatting.

---

### 2. Evidence Integrity Guardrail (100% Verbatim Substrings)
- **Date**: 2026-11-16
- **Decision**: Every single evidence string displayed on the triage board must strictly match as a contiguous substring of the original review text. Any model-generated quote that fails substring verification is rejected and dropped.
- **Alternative**: Trusting raw LLM output or paraphrasing quotes.
- **Reason**: Guarantees zero AI hallucination. Evaluators and Hitwicket engineers can verify that every player quote is 100% authentic.

---

### 3. Static Web Architecture with Supabase Realtime
- **Date**: 2026-11-16
- **Decision**: Deploy as a static React single-page app on Netlify, backed by precomputed JSON artifacts and a lightweight Supabase Postgres Realtime backend.
- **Alternative**: Full-stack Next.js or Node.js server.
- **Reason**: Sub-second global initial page loads, 0 server maintenance overhead, minimal infrastructure costs, and resilient local-only fallback if Supabase is offline.

---

### 4. Row Level Security & RPC-Only Mutations
- **Date**: 2026-11-16
- **Decision**: Disable direct `INSERT`, `UPDATE`, and `DELETE` on all Supabase tables for public clients. All status changes, assignees, and notes must pass through security-definer PostgreSQL functions (`set_status`, `set_assignee`, `add_note`) with rate limiting.
- **Alternative**: Direct client table updates with broad RLS policies.
- **Reason**: Eliminates SQL injection and arbitrary client tampering; guarantees audit logging in `task_activity`; supports optional team PIN locking without table schema alterations.

---

### 5. Procedural Two-Tone Swirl Background
- **Date**: 2026-11-16
- **Decision**: Generate tileable marbled swirl backgrounds mathematically in code via `scripts/make_background.py` (NumPy + Pillow) rather than using stock external illustrations.
- **Alternative**: External SVG or PNG stock images.
- **Reason**: Keeps repository completely self-contained; provides seamless mathematical tiling ($< 1.7$ mean absolute difference across tile boundaries); weighs $< 10\text{ KB}$ in modern WebP.

---

### 6. Team Color Contrast Table & Design Tokens
- **Date**: 2026-11-16
- **Decision**: Set accessible team colors across light and dark modes:
  - Software Engineer: `#4A6FA5`
  - Game Developer: `#5E8C6A`
  - Product Analyst: `#7B5EA7`
  - Product Associate: `#C2607A`
  - Data Analyst: `#3E8E93`
  - UI/UX Designer: `#D98A4A`
  - Growth Analyst: `#B8962E`
  - Marketing Associate: `#BF4B45`
  - Founder’s Office: `#8A9A3B`
- **Reason**: High readability and distinct visual identity across all 9 roles, conforming to WCAG AA contrast ratios against paper and glass surfaces.

---

### 7. CSV Formula Injection Defense
- **Date**: 2026-11-16
- **Decision**: In the Explorer CSV export, any cell beginning with `=, +, -, @` is automatically escaped with an apostrophe prefix (`'`).
- **Alternative**: Raw string output.
- **Reason**: Protects users opening exported files in Microsoft Excel or Google Sheets from arbitrary command execution vulnerabilities.

---

### 8. Team Display Name Prefix ("Team <Role>")
- **Date**: 2026-11-17
- **Decision**: Update `TEAM_DISPLAY_NAMES` across the UI to prepend "Team" to each discipline (e.g., "Team Data Analyst", "Team Growth Analyst", "Team Software Engineer").
- **Alternative**: Displaying role names without the "Team" prefix.
- **Reason**: User requested clear team ownership signposting across the board, sidebar, and progress indicators.

---

### 9. Automated Release Regression & Anomaly Detector
- **Date**: 2026-11-17
- **Decision**: Added automated anomaly detection that tracks complaint volume per app version and week. Flags releases where a complaint theme exceeded $2\times$ its normal baseline volume with $\ge 12$ total version reviews and $\ge 4$ theme complaints.
- **Alternative**: Manual review skimming or generic monthly averages.
- **Reason**: Pinpoints the exact release that introduced code breakages (e.g., v12.31.0 Release Quality 4.05x spike; v12.41.1 Matchmaking 2.6x spike) with verbatim player quotes and routes them to Team Software Engineer and Team Product Analyst.
