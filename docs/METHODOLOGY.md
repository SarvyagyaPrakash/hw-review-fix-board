# Methodology: HW Review-Fix Board

This document provides a comprehensive technical overview of the data engineering, machine learning taxonomy discovery, and triage mechanics used in **HW Review-Fix Board**.

---

## 1. Data Collection & Ethics

- **Target App**: Hitwicket Cricket Strategy Game (`cricketgames.hitwicket.strategy`).
- **Store & Region**: Google Play Store, India (`country="in"`), English (`lang="en"`).
- **Ratings Scoped**: 1, 2, and 3-star reviews only. 4 and 5-star reviews were omitted because they contain generic praise and lack actionable diagnostic signals for engineering triage.
- **Ethics & Politeness**:
  - Paced requests with 2.5s base delay plus random jitter (0 to 1.5s).
  - Exponential backoff on HTTP 429 / 5xx.
  - Zero proxy rotation, CAPTCHA bypass, or evasion techniques.
  - Collected once locally; the deployed website performs zero scraping.

---

## 2. Privacy & PII Redaction Pipeline

Raw review data is untrusted and can contain personal player identifiers. The pipeline executes rigorous anonymisation in `pipeline/clean.py`:

1. **User Identity Dropped**: Reviewer names, user IDs, and profile images are never saved to disk. Each reviewer receives a deterministic alias formatted as `Player ####` derived from a salted SHA-256 hash of their review ID.
2. **Regex PII Redaction**:
   - Emails (`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}`) $\rightarrow$ `[removed]`
   - Phone numbers (7 to 15 digits) $\rightarrow$ `[removed]`
   - UPI handles (e.g. `user@okhdfcbank`, `name@okaxis`, `paytm@ybl`) $\rightarrow$ `[removed]`
   - URLs (`https?://...` or `www....`) $\rightarrow$ `[removed]`
   - Long numeric strings (10+ digits) $\rightarrow$ `[removed]`
3. **Language Filtering**: Reviews must have at least 60% Latin alphabetic characters to keep English and Latin-script Hinglish while dropping Devanagari-dominant text.
4. **Content Deduplication**: Exact duplicates after punctuation striping, followed by near-duplicate detection via RapidFuzz ratio ($\ge 95$).

---

## 3. Taxonomy Discovery & Freezing

The taxonomy was constructed using an empirical hybrid approach:
1. **Unsupervised Clustering**: TF-IDF vectorization (unigrams and bigrams, 500 features) combined with KMeans clustering across $k \in [10, 14]$. Silhouette score optimization confirmed distinct clusters around pay-to-win, frame lag, app crashes, auction bids, and progression gates.
2. **LLM Proposing**: LLM inference over stratified review samples to synthesize human-readable themes.
3. **Frozen Taxonomy v1.0**: 16 frozen themes, where every theme maps to 1–3 functional teams, all 9 Hitwicket teams own at least one theme, and `other` is the 16th entry.

---

## 4. Evidence Integrity (100% Verbatim Substrings)

A foundational architectural requirement is **zero hallucination**:
- Every displayed evidence quote is verified in code as an exact contiguous substring of the original review.
- If a model-generated excerpt cannot be found verbatim in the review text, it is discarded.

---

## 5. Priority Scoring Formula

The triage priority score for each theme $t$ is calculated deterministically as:

$$\text{Priority Score} = \text{round}\left(100 \times \frac{\text{raw}_t}{\max_{t'}(\text{raw}_{t'})}\right)$$

where:
$$\text{raw}_t = \text{volume\_share}_t \times \text{severity\_norm}_t \times \text{recency\_factor}_t \times \text{engagement\_factor}_t$$

- $\text{volume\_share}_t = \frac{n_t}{N}$ (fraction of actionable reviews).
- $\text{severity\_norm}_t = \frac{\overline{\text{severity}}_t}{3.0}$.
- $\text{recency\_factor}_t = \text{clip}\left(\frac{\text{share of } t \text{ in last 90 days}}{\text{share of all actionable in last 90 days}}, 0.5, 1.5\right)$.
- $\text{engagement\_factor}_t = 1.0 + 0.25 \times \min\left(1.0, \frac{\log_{10}(1 + \overline{\text{thumbs}}_t)}{2.0}\right)$.

Confidence labels:
- **High**: $n_t \ge 100$ and independent AI agreement $F_1 \ge 0.75$.
- **Medium**: $n_t \ge 40$.
- **Low**: $n_t < 40$.
