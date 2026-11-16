# Interview Talking Points: HW Review-Fix Board

15 candid interview questions and answers explaining every design choice, data decision, and limitation in this project.

---

### 1. How were the reviews collected?
We used a polite Python script built on `google-play-scraper` to pull 3,000 public reviews (1, 2, and 3 stars) for Hitwicket (`cricketgames.hitwicket.strategy`) from the Google Play Store (India, English). The collector used 2.5s base delays with random jitter, exponential backoff, and state persistence to ensure zero duplicate requests and polite rate limiting.

### 2. Why analyse 1 to 3 star reviews only?
4 and 5 star reviews typically contain generic praise ("best game", "loved it") with low actionable diagnostic utility. 1 to 3 star reviews represent active player friction, broken flows, and churn triggers where engineering and product triage can produce immediate measurable impact.

### 3. How was the 16-theme taxonomy discovered?
We combined unsupervised TF-IDF unigram/bigram KMeans clustering (evaluating silhouette scores across cluster ranges) with LLM theme extraction over stratified samples of player feedback. The resulting 16 themes were frozen into `pipeline/taxonomy.json` v1.0.

### 4. How is evidence integrity enforced?
100% of displayed evidence quotes are verified in code as exact contiguous substrings of the original player review text. If an AI model returns an excerpt that cannot be found verbatim in the review, the issue is dropped or corrected. No quote is ever invented or hallucinated.

### 5. What does the evaluation prove, and what does it not prove?
Our evaluation tests agreement between independent AI labelling passes with distinct prompting structures (`macro-F1 = 0.82` on TEST). We explicitly call this "agreement with independent AI labels"—never "accuracy" or "human-verified". It bounds model ambiguity but does not replace ground-truth human validation.

### 6. How does the priority scoring formula work?
Theme priority is calculated deterministically as:
$$\text{Priority} = \text{round}\left(100 \times \frac{\text{raw}}{\max(\text{raw})}\right)$$
where $\text{raw} = \text{volume\_share} \times \text{severity\_norm} \times \text{recency\_factor} \times \text{engagement\_factor}$.
- Volume share: fraction of actionable reviews mentioning the theme ($n_t / N$).
- Severity norm: average severity on a 1–3 scale divided by 3.
- Recency factor: share of theme complaints occurring in the last 90 days vs. baseline, clipped between 0.5 and 1.5.
- Engagement factor: logarithmic weight from helpful thumbs-up votes ($1 + 0.25 \times \min(1, \log_{10}(1 + \text{thumbs}) / 2)$).

### 7. Why Supabase and static hosting on Netlify?
Static hosting on Netlify ensures sub-second global initial load times ($< 120\text{ KB}$ gzipped initial JS), zero server maintenance, and near-zero hosting cost. Supabase provides Postgres Row Level Security and Realtime WebSockets so multi-team status changes sync live across browsers in under 2 seconds without full-stack server overhead.

### 8. How was player privacy handled?
No reviewer names, Google account IDs, or profile avatars are stored on disk or exposed to the client. Reviewers are displayed as deterministic salted aliases (`Player 1042`). Emails, phone numbers, UPI handles, URLs, and 10+ digit runs are redacted to `[removed]`.

### 9. What would you do with real internal data at Hitwicket?
With internal access, I would join store reviews against player telemetry (Mixpanel/BigQuery/Postgres), linking store review device models to crash stack traces, matchmaking rating bands (MMR), tutorial funnel step drop-offs, and payment gateway logs.

### 10. What would you build next?
1. Realtime webhook alerts: Slack/Discord notifications to owning teams when high-severity complaints surge after a release.
2. Direct Jira/Linear issue creation: 1-click sync from the triage board into team sprint backlogs.
3. Automated regression detection comparing review volume spikes against specific app build numbers.

### 11. How do you handle multi-team ownership?
A single review can impact multiple departments (e.g. auction lag affects both Game Developers and Software Engineers). The triage board renders dedicated blocks for each owning team and tracks progress via a segmented progress bar. When one team marks their part "Done", the bar updates to 50% for all viewers live.

### 12. Why did you choose Groq?
Groq provides blazing inference speeds (hundreds of tokens per second) on open-weights architectures with OpenAI-compatible APIs, allowing fast, low-latency processing while maintaining strict schema outputs.

### 13. How did you handle formula injection in CSV export?
When exporting CSV data in the Explorer, any cell starting with `=, +, -, @` is automatically prefixed with a single quote `'` to prevent spreadsheet formula execution exploits in Excel or Google Sheets.

### 14. How does the app behave if Supabase is offline or not configured?
The app features an in-memory `LocalStore` fallback. If Supabase keys are missing or offline, the app displays a calm banner: "Shared sync is off · Running in local offline mode", allowing full local triage without crashing.

### 15. Limits I should say out loud
- This is an independent, unofficial analysis; it does not reflect internal company metrics.
- The sample only includes English reviews in the India store; regional script complaints were omitted.
- Low-star reviews over-represent dissatisfied players and do not capture general retention drivers.
- AI-suggested experiments are testable starting points, not causal forecasts.
