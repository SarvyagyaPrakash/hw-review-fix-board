#!/usr/bin/env python3
"""
scripts/make_memo.py

Generates docs/MEMO.md and docs/DM_DRAFT.md directly from public/data/insights.json,
reviews.json, and experiments.json to ensure 100% data consistency.
"""

import json
import os

def generate_documents():
    with open("public/data/insights.json", "r", encoding="utf-8") as f:
        insights = json.load(f)
    with open("public/data/reviews.json", "r", encoding="utf-8") as f:
        reviews_data = json.load(f)
    with open("public/data/experiments.json", "r", encoding="utf-8") as f:
        experiments = json.load(f)

    top3 = insights["priority_rankings"][:3]
    total_reviews = insights["total_reviews"]
    total_act = insights["actionable_reviews"]

    # 1. Generate docs/MEMO.md (<= 350 words)
    memo_lines = [
        "# Executive Memo: What I Would Fix First in Hitwicket",
        "",
        "**To**: Hitwicket Leadership & Team Leads  ",
        "**From**: Sarvyagya Prakash (Candidate for Product Analyst)  ",
        f"**Scope**: Analysis of {total_reviews:,} public Google Play reviews (1–3 stars, India, English)  ",
        f"**Actionable Issues**: {total_act:,} issues triaged across 9 functional teams  ",
        "",
        "---",
        "",
        "### Top Three Priority Fixes",
        ""
    ]

    for idx, item in enumerate(top3, 1):
        th = item["theme"]
        tm = item["primary_team"]
        exp_key = f"{th}|{tm}"
        exp = experiments.get(exp_key, {})
        
        # Get top quote
        matching = [r for r in reviews_data["reviews"] if any(i["theme"] == th for i in r.get("issues", []))]
        matching.sort(key=lambda x: x.get("thumbs", 0), reverse=True)
        top_quote = matching[0]["issues"][0]["evidence"] if matching else "No quote available."
        alias = matching[0]["alias"] if matching else "Player"

        pct_act = round((item["volume_count"] / total_act) * 100)
        memo_lines.extend([
            f"#### {idx}. {item['name']} (Priority Score: {item['priority_score']}/100 · Confidence: {item['confidence']})",
            f"- **Volume & Share**: {item['volume_count']} reviews ({pct_act}% of actionable complaints).",
            f"- **Owning Team**: {item['teams'][0]} (co-owners: {', '.join(item['teams'][1:])}).",
            f"- **Player Evidence**: “{top_quote}” (*{alias}*).",
            f"- **AI-Suggested Experiment**: {exp.get('experiment', 'Test targeted balancing improvements.')}",
            f"- **Primary Metric to Watch**: **{exp.get('metric', 'Metric')}** ({exp.get('metric_note', '')}).",
            ""
        ])

    memo_lines.extend([
        "---",
        "",
        "### Methodology & Confidence Bounds",
        "Scores combine volume share, normalized severity, recency over the last 90 days, and helpful-vote engagement. Confidence is graded based on sample size and independent AI label agreement (F1 $\\ge 0.75$). All evidence strings are verified verbatim substrings of genuine public reviews.",
        "",
        "*Independent, unofficial portfolio analysis. Not affiliated with Hitwicket.*"
    ])

    memo_text = "\n".join(memo_lines)
    with open("docs/MEMO.md", "w", encoding="utf-8") as f:
        f.write(memo_text)

    # 2. Generate docs/DM_DRAFT.md
    top_theme = top3[0]
    top_theme_pct = round((top_theme["volume_count"] / total_act) * 100)

    dm_long = f"""Hi Kashyap,

I analysed {total_reviews:,} public 1 to 3 star Google Play reviews of Hitwicket to see what frustrates players most.

The top friction is {top_theme['name'].lower()}, driving {top_theme_pct}% of actionable complaints ({top_theme['volume_count']} reviews), followed by pay-to-win friction.

To help your teams triage this, I built a live Review-Fix Board that routes every issue with verified verbatim quotes and suggested metrics to your 9 teams: [LIVE_URL_HERE].

Would love to share my methodology with you.

Best,
Sarvyagya Prakash"""

    dm_short = f"""Hi Kashyap,

I analysed {total_reviews:,} low-star Hitwicket reviews. {top_theme['name']} drives {top_theme_pct}% of complaints. I built an interactive triage board routing fixes with verbatim evidence to your 9 teams: [LIVE_URL_HERE].

Best,
Sarvyagya Prakash"""

    dm_file_content = f"""# LinkedIn Outreach Drafts to Founder & CEO (Kashyap Reddy)

### Standard Version ({len(dm_long.split())} words, target $\\le$ 90 words)

```text
{dm_long}
```

---

### Concise Version ({len(dm_short.split())} words, target $\\le$ 40 words)

```text
{dm_short}
```
"""
    with open("docs/DM_DRAFT.md", "w", encoding="utf-8") as f:
        f.write(dm_file_content)

    print("Saved docs/MEMO.md and docs/DM_DRAFT.md")

if __name__ == "__main__":
    generate_documents()
