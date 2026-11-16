#!/usr/bin/env python3
"""
pipeline/collect.py

Collects public 1 to 3 star Google Play reviews of Hitwicket (India, English)
in a polite, privacy-safe, resumable manner.
Drops all user names, avatars, and user IDs.
Generates deterministic Player #### aliases.
"""

import argparse
import datetime
import hashlib
import json
import os
import random
import sys
import time
from typing import Dict, List, Optional, Set, Tuple

from google_play_scraper import Sort, reviews

SALT = b"hitwicket_salt_2026_review_alias"

def derive_player_alias(review_id: str) -> str:
    """Derive a deterministic 'Player ####' 4-digit alias using salted SHA-256."""
    h = hashlib.sha256(SALT + review_id.encode("utf-8")).hexdigest()
    num = 1000 + (int(h[:8], 16) % 9000)
    return f"Player {num}"

def filter_and_whitelist(raw: dict) -> dict:
    """Keep only whitelisted fields; drop user names, avatars, and identifiers."""
    review_id = str(raw.get("reviewId", "")).strip()
    
    # Date formatting
    at_val = raw.get("at")
    if isinstance(at_val, (datetime.datetime, datetime.date)):
        at_str = at_val.strftime("%Y-%m-%d %H:%M:%S")
    else:
        at_str = str(at_val) if at_val else None

    replied_at_val = raw.get("repliedAt")
    if isinstance(replied_at_val, (datetime.datetime, datetime.date)):
        replied_at_str = replied_at_val.strftime("%Y-%m-%d %H:%M:%S")
    else:
        replied_at_str = str(replied_at_val) if replied_at_val else None

    # Version preference
    version = raw.get("reviewCreatedVersion") or raw.get("appVersion")
    version_str = str(version).strip() if version else None

    return {
        "id": review_id,
        "alias": derive_player_alias(review_id),
        "stars": int(raw.get("score", 0)),
        "content": str(raw.get("content", "") or ""),
        "date": at_str,
        "thumbs": int(raw.get("thumbsUpCount", 0) or 0),
        "version": version_str,
        "dev_reply_text": raw.get("replyContent"),
        "dev_reply_date": replied_at_str,
    }

def fetch_page_with_retry(app_id: str, lang: str, country: str, sort_mode: Sort,
                         score: int, continuation_token, max_retries: int = 5) -> Tuple[List[dict], Optional[object]]:
    """Fetch a page of reviews with exponential backoff on errors."""
    backoff = 10.0
    for attempt in range(max_retries):
        try:
            res, token = reviews(
                app_id,
                lang=lang,
                country=country,
                sort=sort_mode,
                count=200,
                filter_score_with=score,
                continuation_token=continuation_token,
            )
            return res, token
        except Exception as e:
            print(f"\n[Warning] Error fetching star {score} (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                raise
            time.sleep(backoff)
            backoff *= 2.0
    return [], None

def collect_reviews(
    app_id: str = "cricketgames.hitwicket.strategy",
    lang: str = "en",
    country: str = "in",
    stars: List[int] = [1, 2, 3],
    per_star: int = 1000,
    sleep_base: float = 2.5,
    out_file: str = "data/raw/reviews_raw.jsonl",
    report_file: str = "data/raw/collection_report.json",
    state_file: str = "data/raw/collect_state.json",
    resume: bool = True,
):
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    
    seen_ids: Set[str] = set()
    star_counts: Dict[int, int] = {s: 0 for s in stars}
    duplicates_dropped = 0
    total_requests = 0
    start_time = time.time()
    
    # Load existing reviews if resuming
    if resume and os.path.exists(out_file):
        with open(out_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        record = json.loads(line)
                        rid = record.get("id")
                        s = record.get("stars")
                        if rid:
                            seen_ids.add(rid)
                        if s in star_counts:
                            star_counts[s] += 1
                    except json.JSONDecodeError:
                        continue
        print(f"Resuming collection. Already collected {len(seen_ids)} unique reviews: {star_counts}")

    out_fp = open(out_file, "a", encoding="utf-8")
    
    try:
        for star in stars:
            target = per_star
            collected_this_star = star_counts.get(star, 0)
            if collected_this_star >= target:
                print(f"Star {star}: already met target ({collected_this_star}/{target}). Skipping.")
                continue

            print(f"\n=== Collecting star {star} reviews (current: {collected_this_star}, target: {target}) ===")
            
            # Pass 1: NEWEST, Pass 2: MOST_RELEVANT
            for sort_mode, mode_name in [(Sort.NEWEST, "NEWEST"), (Sort.MOST_RELEVANT, "MOST_RELEVANT")]:
                if collected_this_star >= target:
                    break
                    
                print(f"Starting pass with sort={mode_name} for star {star}...")
                token = None
                empty_pages = 0
                
                while collected_this_star < target:
                    total_requests += 1
                    res, next_token = fetch_page_with_retry(
                        app_id=app_id,
                        lang=lang,
                        country=country,
                        sort_mode=sort_mode,
                        score=star,
                        continuation_token=token,
                    )
                    
                    if not res:
                        print("No more reviews returned on this branch.")
                        break

                    new_on_page = 0
                    for raw_rec in res:
                        clean_rec = filter_and_whitelist(raw_rec)
                        rid = clean_rec["id"]
                        if not rid or rid in seen_ids:
                            duplicates_dropped += 1
                            continue
                        
                        seen_ids.add(rid)
                        collected_this_star += 1
                        new_on_page += 1
                        out_fp.write(json.dumps(clean_rec, ensure_ascii=False) + "\n")
                        
                        if collected_this_star >= target:
                            break

                    out_fp.flush()
                    print(f"  [Star {star} | {mode_name}] Saved {new_on_page} new reviews (total star {star}: {collected_this_star}/{target})")

                    if new_on_page == 0:
                        empty_pages += 1
                        if empty_pages >= 3:
                            print("  3 consecutive pages with 0 new reviews. Moving to next pass.")
                            break
                    else:
                        empty_pages = 0

                    if not next_token or next_token == token:
                        print("  Continuation token finished.")
                        break
                    
                    token = next_token
                    
                    # Polite rate limiting: sleep + jitter (0 - 1.5s)
                    jitter = random.uniform(0.0, 1.5)
                    time.sleep(sleep_base + jitter)

            star_counts[star] = collected_this_star

    finally:
        out_fp.close()

    elapsed = round(time.time() - start_time, 2)
    
    # Analyze date range and versions from collected reviews
    dates = []
    versions = set()
    total_reviews = 0
    final_star_counts: Dict[str, int] = {}
    
    if os.path.exists(out_file):
        with open(out_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    r = json.loads(line)
                    total_reviews += 1
                    s = str(r.get("stars"))
                    final_star_counts[s] = final_star_counts.get(s, 0) + 1
                    d = r.get("date")
                    if d:
                        dates.append(d[:10])
                    v = r.get("version")
                    if v:
                        versions.add(v)

    min_date = min(dates) if dates else None
    max_date = max(dates) if dates else None
    
    # ISO-8601 with Asia/Kolkata offset (+05:30)
    kolkata_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    collected_at_iso = datetime.datetime.now(kolkata_tz).isoformat()

    report = {
        "app_id": app_id,
        "store": "Google Play",
        "country": country,
        "language": lang,
        "stars_requested": stars,
        "per_star_target": per_star,
        "reviews_per_star": final_star_counts,
        "total_collected": total_reviews,
        "duplicates_dropped": duplicates_dropped,
        "date_range": [min_date, max_date],
        "version_count": len(versions),
        "versions_sample": sorted(list(versions))[-10:] if versions else [],
        "total_requests": total_requests,
        "elapsed_seconds": elapsed,
        "collected_at": collected_at_iso,
        "library": "google-play-scraper 1.2.7",
    }
    
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n================ Collection Complete ================")
    print(f"Total reviews saved: {total_reviews}")
    print(f"Per-star breakdown: {final_star_counts}")
    print(f"Date range: {min_date} to {max_date}")
    print(f"Report written to: {report_file}")
    print("=====================================================")

def main():
    parser = argparse.ArgumentParser(description="Collect Google Play reviews for Hitwicket")
    parser.add_argument("--app-id", default="cricketgames.hitwicket.strategy")
    parser.add_argument("--lang", default="en")
    parser.add_argument("--country", default="in")
    parser.add_argument("--stars", default="1,2,3")
    parser.add_argument("--per-star", type=int, default=1000)
    parser.add_argument("--sleep", type=float, default=2.5)
    parser.add_argument("--out", default="data/raw/reviews_raw.jsonl")
    parser.add_argument("--resume", action="store_true", default=True)
    args = parser.parse_args()

    star_list = [int(s.strip()) for s in args.stars.split(",") if s.strip()]
    collect_reviews(
        app_id=args.app_id,
        lang=args.lang,
        country=args.country,
        stars=star_list,
        per_star=args.per_star,
        sleep_base=args.sleep,
        out_file=args.out,
        resume=args.resume,
    )

if __name__ == "__main__":
    main()
