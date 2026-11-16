# Pipeline Evaluation Report

**Evaluation Type**: Agreement with independent AI labels  
*(Note: Never termed "accuracy" or "human-verified" per AGENTS.md § 8 & 14)*

---

## 1. Summary Metrics

| Dataset Split | Sample Size | Macro-F1 | Cohen’s Kappa | Actionable Agreement | Evidence Substring Validity |
|---|---|---|---|---|---|
| **DEV** | 75 | 0.409 | 0.697 | 93.3% | 100.0% |
| **TEST** | 75 | 0.515 | 0.795 | 94.6% | 100.0% |

---

## 2. Top Theme Confusions

1. `lag_performance` $\leftrightarrow$ `crashes_bugs`: Reviews mentioning "game hangs and closes".
2. `pay_to_win` $\leftrightarrow$ `progression_grind`: Reviews discussing card upgrade droughts alongside paid 7-star teams.
3. `pricing_and_shop` $\leftrightarrow$ `support_refunds`: In-app purchase failures vs high gem store prices.
4. `tutorial_length` $\leftrightarrow$ `onboarding_confusion`: Reviews frustrated by forced tutorial sequences.

---

## 3. Human Spot-Check Template

A template of 30 random actionable reviews is saved in `data/labels/spot_check.csv` for future human annotation.
