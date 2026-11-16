# HW Review-Fix Board

> **Independent Product Analysis & Realtime Triage Board for Hitwicket**  
> *Built as a portfolio piece for a Product Analyst role by Sarvyagya Prakash.*  
> *Independent and unofficial. Not affiliated with, endorsed by, or sponsored by Hitwicket.*

---

## Overview

**HW Review-Fix Board** translates 3,000 public 1–3 star player reviews of Hitwicket Cricket Strategy Game into an executive triage dashboard and collaborative operations board across 9 functional departments.

### Key Capabilities

1. **Polite, Privacy-Preserving Ingestion**: 3,000 genuine Google Play reviews collected once locally. Reviewer identities are completely removed, deterministic aliases (`Player 1042`) assigned, and PII (emails, phones, UPI handles) redacted.
2. **100% Evidence Integrity**: Every displayed player quote is strictly verified as a verbatim contiguous substring of the original review.
3. **Deterministic Multi-Team Routing**: Issues map across 9 teams (Software Engineer, Game Developer, Product Analyst, Product Associate, Data Analyst, UI/UX Designer, Growth Analyst, Marketing Associate, Founder’s Office).
4. **Realtime Multi-Team Progress**: Shared issues display a live segmented progress bar. When one team marks their part "Done", the bar updates to 50% for all viewers within 2 seconds via Supabase Realtime (with an in-memory offline fallback).
5. **Printable Executive Fix-First Page**: Highlights the top 3 highest-priority fixes with a visible mathematical scoring formula, transparent confidence ratings, and testable AI-suggested experiments.

---

## Visual Design & Architecture

- **Visual Concept**: Editorial typography (Bricolage Grotesque & Figtree) set over a custom, procedurally generated marbled swirl background (`swirl-light.webp` and `swirl-dark.webp`), generated mathematically in Python.
- **Frontend**: React 18, Vite, TypeScript (strict mode), Tailwind CSS, Recharts (lazy-loaded).
- **Backend**: Supabase PostgreSQL with Row Level Security (RLS) and Realtime WebSockets.
- **Hosting**: Netlify static single-page app with Netlify Functions v2.

---

## Quick Start & Reproduction

### Prerequisites
- Node.js 20+
- Python 3.11+
- Git

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/hw-review-fix-board.git
cd hw-review-fix-board

# Run one-command setup
make setup
```

### 2. Environment Variables
Create a `.env` file at repository root (refer to `.env.example`):
```bash
# Groq LLM Configuration (OpenAI compatible)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b

# Supabase Realtime Backend (Browser-safe publishable credentials)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Netlify Serverless Q&A Function (Optional)
CHAT_ENABLED=false
RATE_SALT=your_random_32_char_salt
```

### 3. Run Pipeline End-to-End
```bash
# Reproduce collection, cleaning, discovery, classification, experiments, and export
make all
```

### 4. Run Development Server
```bash
npm run dev
# Opens at http://localhost:5173
```

### 5. Run Test Suites
```bash
# Runs Python pytest and web Vitest suites
make test
```

---

## Environment Variables Reference

| Variable Name | Required | Scope | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Pipeline / Netlify | Server | Groq API key for theme discovery and serverless Q&A |
| `GROQ_MODEL` | Pipeline / Netlify | Server | Model ID (default: `qwen/qwen3.8-27b`) |
| `VITE_SUPABASE_URL` | Web App | Browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Web App | Browser | Public browser publishable key with RLS |
| `CHAT_ENABLED` | Netlify Function | Server | Toggle for "Ask the reviews" panel (default: `false`) |
| `RATE_SALT` | Netlify Function | Server | Salt for anonymized IP rate-limiting |

---

## Known Limitations

- **1–3 Star Review Focus**: The dataset captures player complaints and friction points; it does not measure positive retention drivers.
- **Language**: English reviews only; Devanagari reviews were filtered out during cleaning.
- **Independent Analysis**: This is an independent portfolio piece based exclusively on public review data. It does not reflect internal Hitwicket analytics or proprietary databases.

---

## License & Credits

Built by **Sarvyagya Prakash** (B.Tech Computer Science & Engineering - AI/ML).  
Independent study for Product Analyst role application at Hitwicket.
