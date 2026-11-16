#!/usr/bin/env python3
"""
pipeline/clean.py

Cleans and anonymises collected Google Play reviews:
1. Normalises unicode & collapses whitespace.
2. Redacts all PII (emails, phone numbers, UPI handles, URLs, 10+ digit runs) to [removed].
3. Drops generic non-actionable one-word reviews or reviews < 4 words.
4. Filters non-Latin/Devanagari text (retains English & Latin-script Hinglish).
5. Eliminates exact and near duplicates (rapidfuzz ratio >= 95 within same star).
6. Adds derived analytical fields (date YYYY-MM-DD, age_days, iso_week, version).
"""

import argparse
import datetime
import json
import os
import re
import unicodedata
from typing import Dict, List, Optional, Set, Tuple
from rapidfuzz import fuzz

# PII Regular Expressions
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
URL_REGEX = re.compile(r'https?://[^\s]+|www\.[^\s]+')
# UPI handles: e.g. user@okaxis, paytm@okhdfcbank, name@upi
UPI_REGEX = re.compile(r'\b[a-zA-Z0-9.\-_]{2,64}@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|ibl|axl|upi)\b', re.IGNORECASE)
# Phone numbers: 7 to 15 digits, optionally with spaces, dashes, or leading +
PHONE_REGEX = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{7,15}\b')
# Any digit run of 10 or more characters
LONG_DIGIT_REGEX = re.compile(r'\b\d{10,}\b')

# Generic spam/phrases that convey zero actionable feedback
GENERIC_PHRASES = {
    "good", "bad", "nice", "worst", "very bad", "very good", "best", "super",
    "nice game", "good game", "bad game", "worst game", "best game", "super game",
    "bakwas", "bekar", "ghatiya", "time waste", "waste of time", "feku", "fake",
    "hate it", "hate this game", "dont download", "don't download", "ok", "okay",
    "poor", "trash", "rubbish", "boring", "useless", "wow", "love it", "superb"
}

def normalise_text(text: str) -> str:
    """Normalise unicode characters and collapse whitespace."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    # Strip non-printable / control characters except standard whitespace
    text = "".join(ch for ch in text if ch.isprintable() or ch in ("\n", "\t", " "))
    # Collapse multiple whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def redact_pii(text: str) -> str:
    """
    Redacts emails, phone numbers, UPI handles, URLs, and long digit strings to [removed].
    Order matters: URLs and emails first, then UPI, then phone & long digit runs.
    """
    if not text:
        return ""
    text = URL_REGEX.sub("[removed]", text)
    text = EMAIL_REGEX.sub("[removed]", text)
    text = UPI_REGEX.sub("[removed]", text)
    text = PHONE_REGEX.sub("[removed]", text)
    text = LONG_DIGIT_REGEX.sub("[removed]", text)
    # Clean up redundant spaces around [removed]
    text = re.sub(r'(\[removed\]\s*)+', '[removed] ', text).strip()
    return text

def is_latin_dominant(text: str, threshold: float = 0.60) -> bool:
    """
    Returns True if at least 60% of alphabetic characters are basic Latin letters.
    Preserves English and Hinglish in Latin script while dropping Devanagari/other scripts.
    """
    alpha_chars = [c for c in text if c.isalpha()]
    if not alpha_chars:
        return True  # If no letters (numbers/punctuation), let word-count rule handle it
    latin_chars = [c for c in alpha_chars if 'a' <= c.lower() <= 'z']
    ratio = len(latin_chars) / len(alpha_chars)
    return ratio >= threshold

def clean_reviews(
    in_file: str = "data/raw/reviews_raw.jsonl",
    out_file: str = "data/processed/reviews_clean.jsonl",
    report_file: str = "data/processed/clean_report.json",
    ref_date_iso: Optional[str] = None,
):
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    
    if ref_date_iso:
        try:
            ref_dt = datetime.datetime.fromisoformat(ref_date_iso)
        except Exception:
            ref_dt = datetime.datetime.now(datetime.timezone.utc)
    else:
        ref_dt = datetime.datetime.now(datetime.timezone.utc)

    total_in = 0
    drop_counts = {
        "too_short_less_than_4_words": 0,
        "generic_phrase_only": 0,
        "non_latin_script": 0,
        "exact_duplicate": 0,
        "near_duplicate": 0,
    }

    seen_normalised_by_star: Dict[int, Set[str]] = {1: set(), 2: set(), 3: set()}
    clean_records_by_star: Dict[int, List[dict]] = {1: [], 2: [], 3: []}
    
    version_counts: Dict[str, int] = {}
    month_counts: Dict[str, int] = {}
    
    with open(in_file, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            total_in += 1
            raw = json.loads(line)
            
            raw_text = raw.get("content", "") or ""
            norm_text = normalise_text(raw_text)
            
            # 1. PII Redaction
            redacted_text = redact_pii(norm_text)
            
            # 2. Word count filter (strip punctuation and emoji)
            words = [w for w in re.findall(r'[A-Za-z0-9]+', redacted_text.lower()) if w != "removed"]
            if len(words) < 4:
                drop_counts["too_short_less_than_4_words"] += 1
                continue
                
            # 3. Generic spam phrases
            clean_phrase = " ".join(words)
            if clean_phrase in GENERIC_PHRASES:
                drop_counts["generic_phrase_only"] += 1
                continue
                
            # 4. English / Latin script filter
            if not is_latin_dominant(redacted_text):
                drop_counts["non_latin_script"] += 1
                continue
                
            star = int(raw.get("stars", 1))
            if star not in clean_records_by_star:
                clean_records_by_star[star] = []
                seen_normalised_by_star[star] = set()

            # 5. Deduplication
            # Exact dedup key
            dedup_key = re.sub(r'[^a-z0-9]', '', clean_phrase)
            if dedup_key in seen_normalised_by_star[star]:
                drop_counts["exact_duplicate"] += 1
                continue
                
            # Near-duplicate check with rapidfuzz (ratio >= 95)
            # Only compare against last 250 items in that star to keep performance O(N)
            is_near_dup = False
            for existing in clean_records_by_star[star][-250:]:
                sim = fuzz.ratio(clean_phrase, existing["_clean_phrase"])
                if sim >= 95:
                    is_near_dup = True
                    break
                    
            if is_near_dup:
                drop_counts["near_duplicate"] += 1
                continue

            seen_normalised_by_star[star].add(dedup_key)
            
            # 6. Date parsing and derived fields
            raw_date = raw.get("date")
            dt_obj = None
            date_str = None
            age_days = 0
            iso_week = None
            
            if raw_date:
                try:
                    dt_obj = datetime.datetime.fromisoformat(raw_date[:19])
                    date_str = dt_obj.strftime("%Y-%m-%d")
                    # Calculate age relative to reference collection time
                    age_days = max(0, (ref_dt.date() - dt_obj.date()).days)
                    iso_year, iso_wk, _ = dt_obj.isocalendar()
                    iso_week = f"{iso_year}-W{iso_wk:02d}"
                    month_key = dt_obj.strftime("%Y-%m")
                    month_counts[month_key] = month_counts.get(month_key, 0) + 1
                except Exception:
                    date_str = raw_date[:10] if len(raw_date) >= 10 else None

            # Normalise version string
            raw_ver = raw.get("version")
            norm_ver = None
            if raw_ver and str(raw_ver).strip() not in ("None", "null", ""):
                norm_ver = str(raw_ver).strip()
                version_counts[norm_ver] = version_counts.get(norm_ver, 0) + 1

            clean_rec = {
                "id": raw["id"],
                "alias": raw.get("alias", f"Player {raw['id'][:4]}"),
                "stars": star,
                "text": redacted_text,
                "date": date_str,
                "age_days": age_days,
                "iso_week": iso_week,
                "version": norm_ver,
                "thumbs": int(raw.get("thumbs", 0)),
                "dev_reply": {
                    "text": redact_pii(normalise_text(raw.get("dev_reply_text", ""))) if raw.get("dev_reply_text") else None,
                    "date": raw.get("dev_reply_date")[:10] if raw.get("dev_reply_date") else None,
                } if raw.get("dev_reply_text") else None,
                "_clean_phrase": clean_phrase,  # Internal field for fuzzy matching
            }
            clean_records_by_star[star].append(clean_rec)

    # Flatten and write to clean JSONL
    total_out = 0
    with open(out_file, "w", encoding="utf-8") as out_fp:
        for s in sorted(clean_records_by_star.keys()):
            for rec in clean_records_by_star[s]:
                total_out += 1
                rec_copy = rec.copy()
                del rec_copy["_clean_phrase"]
                out_fp.write(json.dumps(rec_copy, ensure_ascii=False) + "\n")

    retention_rate = round(total_out / total_in * 100, 2) if total_in > 0 else 0.0

    report = {
        "rows_in": total_in,
        "rows_out": total_out,
        "retention_rate_pct": retention_rate,
        "drop_reasons": drop_counts,
        "language_note": "Kept Latin-dominant text (>=60% Latin alphabetic characters), supporting English and Hinglish in Latin script. Filtered out Devanagari-dominant reviews.",
        "coverage_by_month": dict(sorted(month_counts.items())),
        "coverage_by_version": dict(sorted(version_counts.items(), key=lambda x: x[1], reverse=True)[:15]),
        "processed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    with open(report_file, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print("\n================ Cleaning Complete ================")
    print(f"Input records: {total_in}")
    print(f"Output clean records: {total_out} ({retention_rate}% retained)")
    print(f"Drop breakdown: {drop_counts}")
    print(f"Report written to: {report_file}")
    print("===================================================")

def main():
    parser = argparse.ArgumentParser(description="Clean and anonymise raw Google Play reviews")
    parser.add_argument("--in-file", default="data/raw/reviews_raw.jsonl")
    parser.add_argument("--out-file", default="data/processed/reviews_clean.jsonl")
    parser.add_argument("--report-file", default="data/processed/clean_report.json")
    args = parser.parse_args()

    clean_reviews(in_file=args.in_file, out_file=args.out_file, report_file=args.report_file)

if __name__ == "__main__":
    main()
