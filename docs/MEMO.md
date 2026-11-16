# Executive Memo: What I Would Fix First in Hitwicket

**To**: Hitwicket Leadership & Team Leads  
**From**: Sarvyagya Prakash (Candidate for Product Analyst)  
**Scope**: Analysis of 2,286 public Google Play reviews (1–3 stars, India, English)  
**Actionable Issues**: 728 issues triaged across 9 functional teams  

---

### Top Three Priority Fixes

#### 1. Matchmaking Balance (Priority Score: 100/100 · Confidence: High)
- **Volume & Share**: 205 reviews (28% of actionable complaints).
- **Owning Team**: data-analyst (co-owners: game-developer).
- **Player Evidence**: “matchmaking and rng seem to heavily favour certain player locations” (*Player 3140*).
- **AI-Suggested Experiment**: Test if flagging high-skill opponents in lobby reduces player churn and improves perceived fairness ratings.
- **Primary Metric to Watch**: **retention by device tier** (Monitor if fairness changes improve retention across different hardware performance levels.).

#### 2. Pay To Win Sentiment (Priority Score: 60/100 · Confidence: Medium)
- **Volume & Share**: 95 reviews (13% of actionable complaints).
- **Owning Team**: game-developer (co-owners: product-analyst, founders-office).
- **Player Evidence**: “this game is just like a pay to win game” (*Player 6401*).
- **AI-Suggested Experiment**: Cap the stat boost from premium skins to 5% and monitor high-spenders' win rates against low-spenders.
- **Primary Metric to Watch**: **win rate by squad rating band** (Check if high-spenders' win rates align with their skill-based rating bands.).

#### 3. Ads & Notifications (Priority Score: 34/100 · Confidence: Medium)
- **Volume & Share**: 74 reviews (10% of actionable complaints).
- **Owning Team**: growth-analyst (co-owners: marketing-associate, product-associate).
- **Player Evidence**: “No forced ads” (*Player 8693*).
- **AI-Suggested Experiment**: Reduce push notification frequency by 50% to test impact on user retention and engagement levels.
- **Primary Metric to Watch**: **push opt-out rate** (Lower rate indicates better notification tolerance and reduced user churn.).

---

### Methodology & Confidence Bounds
Scores combine volume share, normalized severity, recency over the last 90 days, and helpful-vote engagement. Confidence is graded based on sample size and independent AI label agreement (F1 $\ge 0.75$). All evidence strings are verified verbatim substrings of genuine public reviews.

*Independent, unofficial portfolio analysis. Not affiliated with Hitwicket.*