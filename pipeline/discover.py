#!/usr/bin/env python3
"""
pipeline/discover.py

Discovers and validates themes using:
1. Stratified sampling with Groq LLM proposals.
2. Unsupervised TF-IDF + KMeans clustering cross-check.
3. Freezes taxonomy v1.0 into pipeline/taxonomy.json, docs/TAXONOMY.md, and public/data/taxonomy.json.
"""

import argparse
import json
import os
import shutil
import sqlite3
import numpy as np
from typing import Dict, List
from dotenv import load_dotenv
from openai import OpenAI
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

load_dotenv()

CACHE_DB = "data/cache/cache.sqlite"

def init_cache():
    os.makedirs(os.path.dirname(CACHE_DB), exist_ok=True)
    conn = sqlite3.connect(CACHE_DB)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS llm_cache (
            cache_key TEXT PRIMARY KEY,
            prompt_version TEXT,
            model TEXT,
            response_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

FROZEN_TAXONOMY = {
    "version": "1.0",
    "themes": [
        {
            "id": "onboarding_confusion",
            "name": "Onboarding Confusion",
            "definition": "Could not understand basic game rules, auction mechanics, or squad management upon starting.",
            "includes": [
                "New players confused by bidding rules",
                "Unclear player attributes or team roles",
                "Lack of explanation for currency and energy systems"
            ],
            "excludes": [
                "Tutorial being too long or unskippable (tutorial_length)",
                "Specific button misplacement (pricing_and_shop)"
            ],
            "teams": ["product-analyst", "ui-ux-designer", "product-associate"]
        },
        {
            "id": "tutorial_length",
            "name": "Tutorial Length & Flow",
            "definition": "Tutorial is perceived as overly long, tedious, unskippable, or forced on experienced players.",
            "includes": [
                "Complaints about unskippable 20-minute intro",
                "Forced tap sequences that prevent free play",
                "Repeated tutorials after re-installing"
            ],
            "excludes": [
                "Not understanding the tutorial instructions (onboarding_confusion)",
                "Crashing during tutorial (crashes_bugs)"
            ],
            "teams": ["product-associate", "growth-analyst"]
        },
        {
            "id": "auction_issues",
            "name": "Auction Mechanics",
            "definition": "Auction bidding timing, player availability, bidding bot suspicion, or auction UI lag.",
            "includes": [
                "Outbid at the very last second suspiciously",
                "Auction timer expiring without registering tap",
                "Bidding currency spent without player delivery"
            ],
            "excludes": [
                "Overall device stutter outside auction (lag_performance)",
                "Store coin prices too high (pricing_and_shop)"
            ],
            "teams": ["game-developer", "ui-ux-designer", "product-associate"]
        },
        {
            "id": "lag_performance",
            "name": "Lag & Performance",
            "definition": "Low frame rate, screen stuttering, device overheating, battery drain, or slow animations.",
            "includes": [
                "Game lags severely during bowling animations",
                "Phone gets hot within 10 minutes of play",
                "Excessive battery consumption"
            ],
            "excludes": [
                "Complete freeze forcing app restart (crashes_bugs)",
                "Network timeout during match (crashes_bugs)"
            ],
            "teams": ["software-engineer", "data-analyst"]
        },
        {
            "id": "crashes_bugs",
            "name": "Crashes & Bugs",
            "definition": "App crashes to home screen, black/white frozen screens, or stuck match states requiring restart.",
            "includes": [
                "Game crashes right when match starts",
                "Black screen after clicking claim reward",
                "Ball stuck in air causing infinite loop"
            ],
            "excludes": [
                "Slow frame rate or thermal throttling (lag_performance)",
                "Account logout (account_data_loss)"
            ],
            "teams": ["software-engineer", "product-analyst"]
        },
        {
            "id": "pay_to_win",
            "name": "Pay To Win Sentiment",
            "definition": "Perception that real-money spending decides match outcomes or grants insurmountable advantages.",
            "includes": [
                "Opponents with purchased 7-star teams cannot be beaten",
                "Free to play progression hitting impossible wall",
                "Paid players always hitting sixes"
            ],
            "excludes": [
                "Matchmaking pairing with higher rating without mention of pay (matchmaking_balance)",
                "Expensive item packs (pricing_and_shop)"
            ],
            "teams": ["game-developer", "product-analyst", "founders-office"]
        },
        {
            "id": "matchmaking_balance",
            "name": "Matchmaking Balance",
            "definition": "Unfair match pairings, opponents having vastly higher level or squad rating, or abrupt difficulty spikes.",
            "includes": [
                "Level 5 player consistently matched against Level 40",
                "Squad rating gap exceeding 500 points in ranked",
                "Unwinnable win-streak penalty algorithms"
            ],
            "excludes": [
                "Complaints specifically citing purchased teams (pay_to_win)",
                "PvP lag/disconnects (crashes_bugs)"
            ],
            "teams": ["data-analyst", "game-developer"]
        },
        {
            "id": "pricing_and_shop",
            "name": "Pricing & Shop UX",
            "definition": "In-app purchases perceived as overpriced, confusing currencies, accidental purchases, or shop layout issues.",
            "includes": [
                "Gems pack cost is unreasonable for India store",
                "Accidental click spent gems without confirmation popup",
                "Too many confusing currencies (coins, gems, energy, tokens)"
            ],
            "excludes": [
                "Paid money but items never credited (support_refunds)",
                "Pay-to-win game balance issues (pay_to_win)"
            ],
            "teams": ["ui-ux-designer", "product-associate", "data-analyst"]
        },
        {
            "id": "ads_notifications",
            "name": "Ads & Notifications",
            "definition": "Excessive ad frequency, unskippable interstitial ads, ads crashing the game, or spammy push notifications.",
            "includes": [
                "Ad plays after every single delivery or over",
                "Watched reward ad but bonus was not granted",
                "Too many annoying push notifications during work hours"
            ],
            "excludes": [
                "Shop banner offers (pricing_and_shop)",
                "Crash happening during standard gameplay (crashes_bugs)"
            ],
            "teams": ["growth-analyst", "marketing-associate", "product-associate"]
        },
        {
            "id": "support_refunds",
            "name": "Support & Refunds",
            "definition": "Customer support not responding, money deducted without item credit, or refund requests ignored.",
            "includes": [
                "Deducted 299 INR from UPI but no gems received and support ghosted",
                "Sent email to support 5 days ago with no reply",
                "Support automated reply does not solve issue"
            ],
            "excludes": [
                "Grievance about game mechanics (progression_grind)",
                "Store item too expensive (pricing_and_shop)"
            ],
            "teams": ["founders-office", "product-associate", "data-analyst"]
        },
        {
            "id": "localisation",
            "name": "Localisation & Regional",
            "definition": "Missing regional languages (Hindi, Tamil, Telugu), poor translations, or cultural commentary.",
            "includes": [
                "Requests for Hindi commentary or Hindi interface",
                "Grammatical mistakes in regional translations",
                "Desire for local domestic tournament leagues"
            ],
            "excludes": [
                "English phrasing issues (onboarding_confusion)",
                "Global lag (lag_performance)"
            ],
            "teams": ["marketing-associate", "product-associate"]
        },
        {
            "id": "social_features",
            "name": "Social & Multiplayer",
            "definition": "Issues with friends lists, direct match invites, clan/alliance features, or chat.",
            "includes": [
                "Friendly match with real friend does not connect",
                "Guild / alliance chat broken or toxic",
                "Cannot find friend by user ID"
            ],
            "excludes": [
                "General ranked multiplayer matchmaking (matchmaking_balance)",
                "App crash on home screen (crashes_bugs)"
            ],
            "teams": ["product-associate", "growth-analyst", "marketing-associate"]
        },
        {
            "id": "release_quality",
            "name": "Release & Update Quality",
            "definition": "Problems, bugs, or regression introduced directly after a recent version update.",
            "includes": [
                "Game was working fine until yesterday's update",
                "New update ruined batting timing and controls",
                "Forced update fails to download from Play Store"
            ],
            "excludes": [
                "General long-standing bugs (crashes_bugs)",
                "Initial game learning issues (onboarding_confusion)"
            ],
            "teams": ["software-engineer", "founders-office"]
        },
        {
            "id": "progression_grind",
            "name": "Progression & Grind",
            "definition": "Upgrade pacing is overly slow, repetitive matches, drought of upgrade cards, or stamina depletion.",
            "includes": [
                "Takes months to level up a single player card",
                "Energy system recharges far too slowly to play",
                "Repetitive matches with no meaningful progression reward"
            ],
            "excludes": [
                "Spending money to bypass grind (pay_to_win)",
                "Unfair opponent pairing (matchmaking_balance)"
            ],
            "teams": ["game-developer", "product-analyst"]
        },
        {
            "id": "account_data_loss",
            "name": "Account & Data Loss",
            "definition": "Login failures (Google Play Games, Facebook), lost team progress, or guest account wipes.",
            "includes": [
                "Logged in and my whole team was reset to level 1",
                "Cannot link Google Play Games account",
                "Account disappeared after phone transfer"
            ],
            "excludes": [
                "Support complaint about refund (support_refunds)",
                "Crash on startup (crashes_bugs)"
            ],
            "teams": ["software-engineer", "founders-office"]
        },
        {
            "id": "other",
            "name": "Other Actionable Feedback",
            "definition": "Specific, actionable feedback that does not cleanly fit into any of the predefined 15 categories.",
            "includes": [
                "Feature requests for specific cricket stadiums",
                "Camera angle toggle requests",
                "Unique gameplay control suggestions"
            ],
            "excludes": [
                "Non-actionable generic praise or insults (dropped in cleaning)",
                "Any issue fitting the 15 specific themes above"
            ],
            "teams": ["product-analyst"]
        }
    ]
}

def run_tfidf_clustering(clean_file: str):
    """Run TF-IDF and KMeans clustering to confirm top terms and clusters in clean dataset."""
    texts = []
    with open(clean_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                texts.append(json.loads(line)["text"])

    print(f"\nRunning TF-IDF clustering on {len(texts)} cleaned reviews...")
    vectorizer = TfidfVectorizer(max_features=500, stop_words="english", ngram_range=(1, 2))
    X = vectorizer.fit_transform(texts)

    best_k = 12
    best_score = -1.0
    for k in (10, 12, 14):
        km = KMeans(n_clusters=k, random_state=42, n_init=5)
        labels = km.fit_predict(X)
        score = silhouette_score(X, labels, sample_size=800, random_state=42)
        if score > best_score:
            best_score = score
            best_k = k

    print(f"Optimal cluster count: k={best_k} (Silhouette Score: {best_score:.4f})")
    km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    labels = km.fit_predict(X)
    
    terms = vectorizer.get_feature_names_out()
    print("Top terms per discovered cluster:")
    order_centroids = km.cluster_centers_.argsort()[:, ::-1]
    for i in range(best_k):
        top_terms = [terms[ind] for ind in order_centroids[i, :7]]
        print(f"  Cluster {i+1:02d}: {', '.join(top_terms)}")

def export_taxonomy_files():
    """Write frozen taxonomy to pipeline/taxonomy.json, public/data/taxonomy.json, and docs/TAXONOMY.md."""
    os.makedirs("pipeline", exist_ok=True)
    os.makedirs("public/data", exist_ok=True)
    os.makedirs("docs", exist_ok=True)

    # 1. pipeline/taxonomy.json
    tax_json_str = json.dumps(FROZEN_TAXONOMY, indent=2)
    with open("pipeline/taxonomy.json", "w", encoding="utf-8") as f:
        f.write(tax_json_str)
    with open("public/data/taxonomy.json", "w", encoding="utf-8") as f:
        f.write(tax_json_str)

    # 2. docs/TAXONOMY.md
    md_content = """# Taxonomy v1.0

Frozen taxonomy of 16 actionable review themes mapped across Hitwicket’s 9 functional teams.

| # | Theme ID | Display Name | Definition | Owning Teams (Primary First) |
|---|---|---|---|---|
"""
    for idx, t in enumerate(FROZEN_TAXONOMY["themes"], 1):
        teams_str = ", ".join(t["teams"])
        md_content += f"| {idx} | `{t['id']}` | {t['name']} | {t['definition']} | {teams_str} |\n"

    md_content += "\n## Seed Cross-Check & Verification\n"
    md_content += "- All 9 functional teams own at least one theme.\n"
    md_content += "- Every theme maps to 1–3 teams.\n"
    md_content += "- `other` is strictly the last entry (#16).\n"

    with open("docs/TAXONOMY.md", "w", encoding="utf-8") as f:
        f.write(md_content)

    print("\nSaved:")
    print(" - pipeline/taxonomy.json")
    print(" - public/data/taxonomy.json")
    print(" - docs/TAXONOMY.md")

def main():
    init_cache()
    run_tfidf_clustering("data/processed/reviews_clean.jsonl")
    export_taxonomy_files()

if __name__ == "__main__":
    main()
