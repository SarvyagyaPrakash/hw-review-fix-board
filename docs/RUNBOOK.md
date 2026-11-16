# Runbook: Pipeline & Web Commands

This document lists every command to reproduce the data pipeline, run tests, and build the web application from scratch.

---

### 1. Environment Setup

```bash
make setup
```
**Expected Output**:
- Python virtual environment `.venv` created with Python 3.11+.
- Python dependencies installed (`google-play-scraper`, `openai`, `pydantic`, `pandas`, `scikit-learn`, `Pillow`, `pytest`).
- Node packages installed (`package.json`).

---

### 2. Collect Raw Reviews

```bash
make collect
```
**Expected Output**:
- Downloads 3,000 public 1–3 star reviews for Hitwicket (`cricketgames.hitwicket.strategy`).
- Drops user names, user images, and user IDs.
- Outputs: `data/raw/reviews_raw.jsonl` and `data/raw/collection_report.json`.

---

### 3. Clean & Anonymise

```bash
make clean
```
**Expected Output**:
- Normalises unicode and whitespace.
- Redacts PII (emails, phone numbers, UPI handles, URLs, long digit strings) to `[removed]`.
- Filters out non-Latin text and reviews $< 4$ words.
- Outputs: `data/processed/reviews_clean.jsonl` and `data/processed/clean_report.json`.

---

### 4. Discover & Freeze Taxonomy

```bash
make discover
```
**Expected Output**:
- Runs TF-IDF & KMeans clustering cross-check.
- Freezes 16-theme taxonomy mapped across all 9 teams.
- Outputs: `pipeline/taxonomy.json`, `public/data/taxonomy.json`, `docs/TAXONOMY.md`.

---

### 5. Classify Reviews

```bash
make classify
```
**Expected Output**:
- Classifies actionable reviews into themes with severity and problem summaries.
- Enforces 100% exact verbatim substring verification for all evidence quotes.
- Outputs: `data/processed/reviews_classified.jsonl` and `data/processed/classify_report.json`.

---

### 6. Generate Experiment Library

```bash
make experiments
```
**Expected Output**:
- Generates testable hypotheses and metrics for every `(theme, team)` pair using strict team metric vocabularies.
- Outputs: `data/processed/experiments.json` and `public/data/experiments.json`.

---

### 7. Run AI-against-AI Evaluation

```bash
make evaluate
```
**Expected Output**:
- Evaluates production classification against independent reference pass.
- Computes macro-F1, Cohen's kappa, and top confusions.
- Outputs: `public/data/eval.json`, `docs/EVAL_REPORT.md`, `data/labels/spot_check.csv`.

---

### 8. Export Production Datasets

```bash
make export
```
**Expected Output**:
- Calculates priority scores, aggregate statistics, and validates all JSON schemas.
- Confirms `public/data/reviews.json` is $\le 600\text{ KB}$ gzipped.
- Outputs: `public/data/*.json`.

---

### 9. Run Test Suites

```bash
make test
```
**Expected Output**:
- Pytest suite passes: collection whitelist, PII redaction, drop rules.
- Vitest suite passes: ProgressBar multi-team rounding, TaskStore local mode, optimistic rollback.

---

### 10. Web Build

```bash
make web-build
```
**Expected Output**:
- TypeScript strict typecheck succeeds with 0 errors.
- Vite builds production bundle into `dist/` with initial route JS $< 200\text{ KB}$ gzipped.
