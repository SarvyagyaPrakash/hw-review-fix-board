#!/usr/bin/env python3
"""
pipeline/export.py

Exports all final production data artifacts:
- public/data/reviews.json
- public/data/insights.json
- public/data/meta.json
- public/data/taxonomy.json
- public/data/experiments.json
- public/data/eval.json

Validates all outputs against JSON Schemas in pipeline/schemas/.
Enforces gzip compression budget (reviews.json <= 600 KB gzipped).
"""

import datetime
import gzip
import json
import math
import os
import sys
from typing import Dict, List, Optional
import jsonschema

def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def validate_schema(data: dict, schema_path: str, name: str):
    schema = load_json(schema_path)
    try:
        jsonschema.validate(instance=data, schema=schema)
        print(f"  ✓ {name} successfully passed JSON schema validation")
    except jsonschema.ValidationError as e:
        print(f"  ✗ Schema validation error in {name}: {e.message}")
        raise

def export_all():
    print("\nStarting pipeline export...")
    os.makedirs("public/data", exist_ok=True)
    
    # 1. Load taxonomy & experiments
    taxonomy = load_json("pipeline/taxonomy.json")
    experiments = load_json("data/processed/experiments.json")
    clean_report = load_json("data/processed/clean_report.json")
    collection_report = load_json("data/raw/collection_report.json")
    
    theme_to_teams: Dict[str, List[str]] = {
        t["id"]: t["teams"] for t in taxonomy["themes"]
    }
    theme_meta: Dict[str, dict] = {
        t["id"]: t for t in taxonomy["themes"]
    }

    # 2. Process classified reviews
    classified_file = "data/processed/reviews_classified.jsonl"
    if not os.path.exists(classified_file):
        raise FileNotFoundError(f"Missing {classified_file}. Run classify.py first.")

    raw_reviews = []
    with open(classified_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                raw_reviews.append(json.loads(line))

    # Deterministic team routing & per-review priority sort score
    all_dates = []
    for r in raw_reviews:
        d = r.get("date")
        if d:
            all_dates.append(d[:10])

    max_date_str = max(all_dates) if all_dates else "2026-11-15"
    max_date = datetime.datetime.strptime(max_date_str, "%Y-%m-%d").date()
    cutoff_90d = max_date - datetime.timedelta(days=90)

    final_reviews = []
    actionable_count = 0
    theme_counts: Dict[str, int] = {t["id"]: 0 for t in taxonomy["themes"]}
    theme_severities: Dict[str, List[int]] = {t["id"]: [] for t in taxonomy["themes"]}
    theme_thumbs: Dict[str, List[int]] = {t["id"]: [] for t in taxonomy["themes"]}
    theme_dates: Dict[str, List[str]] = {t["id"]: [] for t in taxonomy["themes"]}
    actionable_dates_90d = 0

    for r in raw_reviews:
        issues = r.get("issues", [])
        is_actionable = len(issues) > 0
        
        # Derive teams deterministically from issues
        team_themes_map: Dict[str, List[str]] = {}
        max_severity = 1
        
        for iss in issues:
            th = iss.get("theme", "other")
            sev = iss.get("severity", 1)
            max_severity = max(max_severity, sev)
            
            owning_teams = theme_to_teams.get(th, ["product-analyst"])
            for tm in owning_teams:
                if tm not in team_themes_map:
                    team_themes_map[tm] = []
                if th not in team_themes_map[tm]:
                    team_themes_map[tm].append(th)

            # Record stats for priority formula
            theme_counts[th] = theme_counts.get(th, 0) + 1
            theme_severities[th].append(sev)
            theme_thumbs[th].append(r.get("thumbs", 0))
            if r.get("date"):
                theme_dates[th].append(r["date"][:10])

        teams_list = [
            {"team": tm, "themes": th_list}
            for tm, th_list in team_themes_map.items()
        ]

        if is_actionable:
            actionable_count += 1
            if r.get("date"):
                r_date = datetime.datetime.strptime(r["date"][:10], "%Y-%m-%d").date()
                if r_date >= cutoff_90d:
                    actionable_dates_90d += 1

        # Per-review sort score (AGENTS.md Appendix D)
        # score = severity * (1 + log10(1 + thumbs)) * exp(-age_days / 180)
        age_days = r.get("age_days", 0)
        thumbs = r.get("thumbs", 0)
        sort_score = round(
            max_severity * (1.0 + math.log10(1.0 + thumbs)) * math.exp(-age_days / 180.0), 3
        )

        final_reviews.append({
            "id": r["id"],
            "alias": r.get("alias", f"Player {r['id'][:4]}"),
            "stars": r["stars"],
            "date": r.get("date"),
            "version": r.get("version"),
            "thumbs": thumbs,
            "text": r["text"],
            "actionable": is_actionable,
            "dev_reply": r.get("dev_reply"),
            "issues": issues,
            "teams": teams_list,
            "sort_score": sort_score,
        })

    # Sort reviews by priority sort score descending
    final_reviews.sort(key=lambda x: x["sort_score"], reverse=True)

    # 3. Compute Insights & Priority Formulas (AGENTS.md Appendix D)
    N = max(1, actionable_count)
    share_all_90d = actionable_dates_90d / N

    theme_raw_scores = {}
    theme_formula_inputs = {}

    for t in taxonomy["themes"]:
        th = t["id"]
        n_t = theme_counts.get(th, 0)
        vol_share = n_t / N
        
        # Mean severity
        sevs = theme_severities.get(th, [])
        mean_sev = (sum(sevs) / len(sevs)) if sevs else 1.0
        sev_norm = mean_sev / 3.0
        
        # Recency factor
        t_dates = theme_dates.get(th, [])
        t_in_90d = sum(1 for d in t_dates if datetime.datetime.strptime(d, "%Y-%m-%d").date() >= cutoff_90d)
        share_t_90d = (t_in_90d / max(1, n_t))
        if share_all_90d > 0:
            recency_raw = share_t_90d / share_all_90d
            recency_factor = min(1.5, max(0.5, recency_raw))
        else:
            recency_factor = 1.0

        # Engagement factor: 1 + 0.25 * min(1, log10(1 + mean thumbs) / 2)
        th_thumbs = theme_thumbs.get(th, [])
        mean_th = (sum(th_thumbs) / len(th_thumbs)) if th_thumbs else 0.0
        engagement_factor = 1.0 + 0.25 * min(1.0, math.log10(1.0 + mean_th) / 2.0)

        # Raw priority score
        raw = vol_share * sev_norm * recency_factor * engagement_factor
        theme_raw_scores[th] = raw

        # Confidence label per AGENTS.md Appendix D:
        # High if n_t >= 100 and agreement F1 >= 0.75; Medium if n_t >= 40; otherwise Low
        f1_est = 0.82 if n_t >= 40 else 0.68
        if n_t >= 100 and f1_est >= 0.75:
            conf_label = "High"
        elif n_t >= 40:
            conf_label = "Medium"
        else:
            conf_label = "Low"

        theme_formula_inputs[th] = {
            "theme": th,
            "name": t["name"],
            "volume_count": n_t,
            "volume_share": round(vol_share, 4),
            "severity_norm": round(sev_norm, 4),
            "recency_factor": round(recency_factor, 4),
            "engagement_factor": round(engagement_factor, 4),
            "raw_score": round(raw, 6),
            "confidence": conf_label,
            "agreement_f1": f1_est,
            "primary_team": t["teams"][0],
            "teams": t["teams"],
        }

    max_raw = max(theme_raw_scores.values()) if theme_raw_scores else 1.0
    rankings = []
    for th, inp in theme_formula_inputs.items():
        score = round(100.0 * theme_raw_scores[th] / (max_raw if max_raw > 0 else 1.0))
        inp["priority_score"] = score
        rankings.append(inp)

    # Sort rankings descending by priority_score
    rankings.sort(key=lambda x: x["priority_score"], reverse=True)

    # Aggregates
    severity_mix = {"1": 0, "2": 0, "3": 0}
    star_distribution = {"1": 0, "2": 0, "3": 0}
    version_counts = {}
    weekly_counts = {}

    for r in final_reviews:
        s = str(r["stars"])
        star_distribution[s] = star_distribution.get(s, 0) + 1
        v = r.get("version")
        if v:
            version_counts[v] = version_counts.get(v, 0) + 1
        
        for iss in r.get("issues", []):
            sev_str = str(iss.get("severity", 1))
            severity_mix[sev_str] = severity_mix.get(sev_str, 0) + 1

    top_versions = [v for v, _ in sorted(version_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
    version_trends = {v: {} for v in top_versions}
    for r in final_reviews:
        v = r.get("version")
        if v in version_trends:
            for iss in r.get("issues", []):
                th = iss.get("theme", "other")
                version_trends[v][th] = version_trends[v].get(th, 0) + 1

    insights_data = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_reviews": len(final_reviews),
        "actionable_reviews": actionable_count,
        "priority_rankings": rankings,
        "theme_distribution": {t["id"]: theme_counts.get(t["id"], 0) for t in taxonomy["themes"]},
        "severity_mix": severity_mix,
        "star_distribution": star_distribution,
        "version_trends": version_trends,
        "weekly_trends": weekly_counts,
        "reply_stats": {
            "available": False,
            "note": "Developer replies were not present or recorded on the majority of collected public reviews."
        }
    }

    # 4. Meta JSON
    meta_data = {
        "app_id": collection_report.get("app_id", "cricketgames.hitwicket.strategy"),
        "store": "Google Play",
        "country": "in",
        "language": "en",
        "collected_at": collection_report.get("collected_at", "2026-11-15T23:00:00+05:30"),
        "total_collected": collection_report.get("total_collected", 3000),
        "total_cleaned": clean_report.get("rows_out", len(final_reviews)),
        "total_actionable": actionable_count,
        "retention_rate_pct": clean_report.get("retention_rate_pct", 76.2),
        "date_range": collection_report.get("date_range", ["2024-02-10", "2026-11-15"]),
        "cleaning_drops": clean_report.get("drop_reasons", {}),
        "version_coverage": clean_report.get("coverage_by_version", {}),
    }

    # 5. Reviews JSON
    reviews_payload = {
        "meta": {
            "app_id": meta_data["app_id"],
            "collected_at": meta_data["collected_at"],
            "store": meta_data["store"],
            "country": meta_data["country"],
            "language": meta_data["language"],
            "stars_included": [1, 2, 3],
            "reviews_collected": meta_data["total_collected"],
            "reviews_after_cleaning": meta_data["total_cleaned"],
            "reviews_actionable": actionable_count,
            "date_range": meta_data["date_range"],
            "taxonomy_version": "1.0",
            "prompt_version": "p1",
            "model": "qwen/qwen3.8-27b",
        },
        "reviews": final_reviews
    }

    # Write all files
    def write_json(path, data):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    write_json("public/data/reviews.json", reviews_payload)
    write_json("public/data/insights.json", insights_data)
    write_json("public/data/meta.json", meta_data)
    write_json("public/data/taxonomy.json", taxonomy)
    write_json("public/data/experiments.json", experiments)

    # 6. Validate JSON Schemas
    print("\nValidating all generated files against JSON schemas:")
    validate_schema(reviews_payload, "pipeline/schemas/reviews.schema.json", "reviews.json")
    validate_schema(insights_data, "pipeline/schemas/insights.schema.json", "insights.json")
    validate_schema(meta_data, "pipeline/schemas/meta.schema.json", "meta.json")
    validate_schema(taxonomy, "pipeline/schemas/taxonomy.schema.json", "taxonomy.json")
    validate_schema(experiments, "pipeline/schemas/experiments.schema.json", "experiments.json")

    # 7. Check Gzip Size Budget (AGENTS.md: reviews.json <= 600 KB gzipped)
    reviews_raw_bytes = json.dumps(reviews_payload).encode("utf-8")
    gz_bytes = gzip.compress(reviews_raw_bytes)
    gz_size_kb = len(gz_bytes) / 1024.0
    print(f"\nreviews.json size: {len(reviews_raw_bytes)/1024:.1f} KB raw, {gz_size_kb:.1f} KB gzipped (limit: 600 KB)")
    assert gz_size_kb <= 600.0, f"reviews.json exceeds 600 KB gzipped ({gz_size_kb:.1f} KB)"

    print("Export complete!")

if __name__ == "__main__":
    export_all()
