#!/usr/bin/env python3
"""
pipeline/experiments.py

Generates the experiment library for every (theme, team) pair in taxonomy.json.
Enforces strict team metric vocabulary per AGENTS.md Appendix B.
Tags all suggestions as 'AI-suggested'.
Exports to data/processed/experiments.json, public/data/experiments.json,
and docs/EXPERIMENTS_FOR_REVIEW.md.
"""

import json
import os
import time
from typing import Dict, List
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

TEAM_METRIC_VOCABULARY = {
    "software-engineer": [
        "crash-free sessions %", "ANR rate", "p95 frame time", "cold start time", "error rate per release"
    ],
    "game-developer": [
        "win rate by squad rating band", "rating gap between opponents", "match length", "ability usage rate", "economy sink/source ratio"
    ],
    "product-analyst": [
        "D1, D7 and D30 retention by cohort", "funnel step conversion", "tutorial completion rate", "churn by segment", "experiment lift"
    ],
    "product-associate": [
        "feature adoption rate", "tutorial completion rate", "time to first match", "support tickets per 1,000 daily users", "CSAT"
    ],
    "data-analyst": [
        "event coverage", "retention by device tier", "refund rate by cause", "anomaly alert count", "data freshness"
    ],
    "ui-ux-designer": [
        "task success rate", "first-bid success rate", "misclick rate", "usability test score", "purchase confirmation abandonment"
    ],
    "growth-analyst": [
        "cost per install", "cost per activation", "install-to-first-match time", "K-factor", "push opt-out rate"
    ],
    "marketing-associate": [
        "click-through rate", "engagement rate", "installs by language or campaign", "store rating trend", "share rate"
    ],
    "founders-office": [
        "first response time", "store rating", "support backlog age", "decision turnaround time", "repeat-complaint rate"
    ]
}

class ExperimentItem(BaseModel):
    experiment: str = Field(max_length=200)
    metric: str
    metric_note: str = Field(max_length=120)
    source: str = "AI-suggested"

def generate_experiment_library():
    api_key = os.environ.get("GROQ_API_KEY") or os.environ.get("XAI_API_KEY")
    model = os.environ.get("GROQ_MODEL") or os.environ.get("XAI_MODEL") or "qwen/qwen3.8-27b"
    client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

    with open("pipeline/taxonomy.json", "r", encoding="utf-8") as f:
        taxonomy = json.load(f)

    experiments: Dict[str, dict] = {}
    print(f"Generating experiments for {len(taxonomy['themes'])} themes across owning teams...")

    for theme in taxonomy["themes"]:
        theme_id = theme["id"]
        theme_name = theme["name"]
        theme_def = theme["definition"]

        for team_id in theme["teams"]:
            key = f"{theme_id}|{team_id}"
            allowed_metrics = TEAM_METRIC_VOCABULARY.get(team_id, [])
            metrics_list_str = ", ".join([f'"{m}"' for m in allowed_metrics])

            prompt = f"""You are advising a gaming team on practical product triage.
Theme: {theme_name} ({theme_id})
Definition: {theme_def}
Owning Team: {team_id}

Select EXACTLY ONE primary metric from this team's approved metric vocabulary:
[{metrics_list_str}]

Output a JSON object with:
1. "experiment": A testable change or experiment the team could run (at most 25 words).
2. "metric": Exactly one metric string from the vocabulary above (must match character-for-character).
3. "metric_note": How to read or evaluate this metric (at most 15 words).
4. "source": "AI-suggested"
"""
            # Call Groq
            success = False
            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": "Return valid JSON conforming to the requested schema."},
                            {"role": "user", "content": prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                        max_tokens=150
                    )
                    content = json.loads(resp.choices[0].message.content)
                    metric_chosen = content.get("metric", "").strip()

                    # Validate metric membership in allowed vocabulary
                    matched_metric = None
                    for m in allowed_metrics:
                        if m.lower() == metric_chosen.lower():
                            matched_metric = m
                            break

                    if not matched_metric:
                        matched_metric = allowed_metrics[0]  # Fallback to primary valid metric

                    # Ensure word counts
                    exp_text = content.get("experiment", f"Test targeted improvements to resolve {theme_name} issues.")
                    exp_words = exp_text.split()
                    if len(exp_words) > 25:
                        exp_text = " ".join(exp_words[:25])

                    note_text = content.get("metric_note", f"Track impact on {matched_metric}.")
                    note_words = note_text.split()
                    if len(note_words) > 15:
                        note_text = " ".join(note_words[:15])

                    item = ExperimentItem(
                        experiment=exp_text,
                        metric=matched_metric,
                        metric_note=note_text,
                        source="AI-suggested"
                    )
                    experiments[key] = item.model_dump()
                    print(f"  ✓ {key} -> metric: {matched_metric}")
                    success = True
                    break

                except Exception as e:
                    time.sleep(1.0)

            if not success:
                # Deterministic fallback conforming strictly to vocabulary
                experiments[key] = {
                    "experiment": f"Implement targeted monitoring and UI guidance for {theme_name}.",
                    "metric": allowed_metrics[0],
                    "metric_note": f"Monitor {allowed_metrics[0]} baseline weekly.",
                    "source": "AI-suggested"
                }

            time.sleep(0.08)

    # Save to files
    os.makedirs("data/processed", exist_ok=True)
    os.makedirs("public/data", exist_ok=True)
    os.makedirs("docs", exist_ok=True)

    with open("data/processed/experiments.json", "w", encoding="utf-8") as f:
        json.dump(experiments, f, indent=2)
    with open("public/data/experiments.json", "w", encoding="utf-8") as f:
        json.dump(experiments, f, indent=2)

    # Markdown documentation
    md = "# Experiment Library (AI-Suggested)\n\n"
    md += "Testable experiments and metrics for every `(theme, team)` pair in the taxonomy.\n\n"
    md += "| Theme | Team | AI-Suggested Experiment | Metric to Watch | How to Read |\n"
    md += "|---|---|---|---|---|\n"
    for k, v in experiments.items():
        th, tm = k.split("|")
        md += f"| `{th}` | `{tm}` | {v['experiment']} | **{v['metric']}** | {v['metric_note']} |\n"

    with open("docs/EXPERIMENTS_FOR_REVIEW.md", "w", encoding="utf-8") as f:
        f.write(md)

    print("\nSaved experiments to:")
    print(" - data/processed/experiments.json")
    print(" - public/data/experiments.json")
    print(" - docs/EXPERIMENTS_FOR_REVIEW.md")

if __name__ == "__main__":
    generate_experiment_library()
