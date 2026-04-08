#!/usr/bin/env python3
"""
FIFA World Cup 2026 — Resale Marketplace Price Scraper
Scrapes Cat 1/2/3/4 best (lowest) and max prices for all 104 matches.

Requirements:
    pip install requests beautifulsoup4 browser-cookie3

Usage:
    1. Log into https://fwc26-resale-usd.tickets.fifa.com in Chrome first.
    2. Run: python scrape_resale_prices.py
    3. Output: src/data/fifa-marketplace-values-latest.json

Re-run every few days to track price changes.
"""

import json
import sqlite3
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

from bs4 import BeautifulSoup

# curl_cffi impersonates Chrome's TLS fingerprint — required to bypass Akamai/DataDome.
# pip install curl_cffi
try:
    from curl_cffi import requests as requests
    _IMPERSONATE = "chrome"
except ImportError:
    import requests
    _IMPERSONATE = None
    logging.warning("curl_cffi not installed — falling back to requests (will likely 403). Run: pip install curl_cffi")

# ── Cookie sources (tried in order) ─────────────────────────────────────────
# 1. scripts/cookie.txt  — paste your DevTools cookie string here and it's used automatically
# 2. browser_cookie3     — auto-loads from Chrome (requires pip install browser-cookie3)
# 3. Interactive prompt  — fallback if both above fail
COOKIE_FILE = Path(__file__).parent / "cookie.txt"

try:
    import browser_cookie3
    _HAS_BROWSER_COOKIE3 = True
except ImportError:
    _HAS_BROWSER_COOKIE3 = False
    logging.warning("browser_cookie3 not installed — falling back to cookie.txt or manual paste.")

# ─────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://fwc26-resale-usd.tickets.fifa.com"
LANG     = "en"

# Rate limit: be polite. 1 request every ~2 seconds.
REQUEST_DELAY_SECS = 2.0

# Categories to extract (None = extract all)
# Set to ["Category 1","Category 2","Category 3","Category 4"] to filter
TARGET_CATEGORIES = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ── All 104 match performance IDs + their resale advantage IDs ───────────────
# Extracted from the match-selection page on 2026-04-08.
# Advantage IDs rarely change; performance IDs are static per match.
ALL_MATCHES = [
  {"matchNum":   1, "perfId": "10229225516056", "round": "Match 1",   "advIds": ["10229516236677","10229516236678","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":   2, "perfId": "10229226700886", "round": "Match 2",   "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828"]},
  {"matchNum":   3, "perfId": "10229226700887", "round": "Match 3",   "advIds": ["10229516236677","10229516236678","10229893994049","10229966499828","10229966507808","10229966507809","10229966507810"]},
  {"matchNum":   4, "perfId": "10229226700888", "round": "Match 4",   "advIds": ["10229516236677","10229516236678","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":   5, "perfId": "10229226700889", "round": "Match 5",   "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":   6, "perfId": "10229226700890", "round": "Match 6",   "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":   7, "perfId": "10229226700891", "round": "Match 7",   "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":   8, "perfId": "10229226700892", "round": "Match 8",   "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":   9, "perfId": "10229226700893", "round": "Match 9",   "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  10, "perfId": "10229226700895", "round": "Match 10",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124","10229997366848"]},
  {"matchNum":  11, "perfId": "10229226700896", "round": "Match 11",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  12, "perfId": "10229226700906", "round": "Match 12",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  13, "perfId": "10229226700899", "round": "Match 13",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  14, "perfId": "10229226700902", "round": "Match 14",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  15, "perfId": "10229226700901", "round": "Match 15",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  16, "perfId": "10229226700903", "round": "Match 16",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  17, "perfId": "10229226700904", "round": "Match 17",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  18, "perfId": "10229226700905", "round": "Match 18",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  19, "perfId": "10229226700907", "round": "Match 19",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  20, "perfId": "10229226700908", "round": "Match 20",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  21, "perfId": "10229226700909", "round": "Match 21",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  22, "perfId": "10229226700910", "round": "Match 22",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  23, "perfId": "10229226700911", "round": "Match 23",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  24, "perfId": "10229226700912", "round": "Match 24",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  25, "perfId": "10229226700913", "round": "Match 25",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  26, "perfId": "10229226700914", "round": "Match 26",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  27, "perfId": "10229226700915", "round": "Match 27",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  28, "perfId": "10229226700916", "round": "Match 28",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828"]},
  {"matchNum":  29, "perfId": "10229226700917", "round": "Match 29",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  30, "perfId": "10229226700918", "round": "Match 30",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  31, "perfId": "10229226700919", "round": "Match 31",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  32, "perfId": "10229226700920", "round": "Match 32",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  33, "perfId": "10229226700921", "round": "Match 33",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507808","10229966507809","10229966507810","10229997366848"]},
  {"matchNum":  34, "perfId": "10229226700922", "round": "Match 34",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  35, "perfId": "10229226700923", "round": "Match 35",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  36, "perfId": "10229226700924", "round": "Match 36",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  37, "perfId": "10229226700925", "round": "Match 37",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  38, "perfId": "10229226700926", "round": "Match 38",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  39, "perfId": "10229226700927", "round": "Match 39",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  40, "perfId": "10229226700928", "round": "Match 40",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  41, "perfId": "10229226700929", "round": "Match 41",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  42, "perfId": "10229226700930", "round": "Match 42",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  43, "perfId": "10229226700931", "round": "Match 43",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  44, "perfId": "10229226700932", "round": "Match 44",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  45, "perfId": "10229226700933", "round": "Match 45",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  46, "perfId": "10229226700934", "round": "Match 46",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  47, "perfId": "10229226700935", "round": "Match 47",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  48, "perfId": "10229226700936", "round": "Match 48",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  49, "perfId": "10229226700937", "round": "Match 49",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  50, "perfId": "10229226700938", "round": "Match 50",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  51, "perfId": "10229226700941", "round": "Match 51",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  52, "perfId": "10229226700942", "round": "Match 52",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  53, "perfId": "10229226700940", "round": "Match 53",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  54, "perfId": "10229226700939", "round": "Match 54",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828"]},
  {"matchNum":  55, "perfId": "10229226700943", "round": "Match 55",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  56, "perfId": "10229226700944", "round": "Match 56",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507809","10229966507810","10229967681124","10229997366848"]},
  {"matchNum":  57, "perfId": "10229226700945", "round": "Match 57",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  58, "perfId": "10229226700946", "round": "Match 58",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  59, "perfId": "10229226700947", "round": "Match 59",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  60, "perfId": "10229226700948", "round": "Match 60",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  61, "perfId": "10229226700949", "round": "Match 61",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507809","10229966507810","10229967681124"]},
  {"matchNum":  62, "perfId": "10229226700950", "round": "Match 62",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  63, "perfId": "10229226700951", "round": "Match 63",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  64, "perfId": "10229226700952", "round": "Match 64",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  65, "perfId": "10229226700953", "round": "Match 65",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  66, "perfId": "10229226700954", "round": "Match 66",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  67, "perfId": "10229226700955", "round": "Match 67",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  68, "perfId": "10229226700956", "round": "Match 68",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  69, "perfId": "10229226700959", "round": "Match 69",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  70, "perfId": "10229226700960", "round": "Match 70",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  71, "perfId": "10229226700957", "round": "Match 71",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  72, "perfId": "10229226700958", "round": "Match 72",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  73, "perfId": "10229226725328", "round": "Match 73",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  74, "perfId": "10229226725329", "round": "Match 74",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  75, "perfId": "10229226725330", "round": "Match 75",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  76, "perfId": "10229226725331", "round": "Match 76",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  77, "perfId": "10229226725332", "round": "Match 77",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  78, "perfId": "10229226725333", "round": "Match 78",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  79, "perfId": "10229226725334", "round": "Match 79",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  80, "perfId": "10229226725335", "round": "Match 80",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810"]},
  {"matchNum":  81, "perfId": "10229226725336", "round": "Match 81",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  82, "perfId": "10229226725337", "round": "Match 82",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  83, "perfId": "10229226725338", "round": "Match 83",  "advIds": ["10229516236677","10229516236678","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  84, "perfId": "10229226725339", "round": "Match 84",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810"]},
  {"matchNum":  85, "perfId": "10229226725340", "round": "Match 85",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  86, "perfId": "10229226725341", "round": "Match 86",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  87, "perfId": "10229226725342", "round": "Match 87",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  88, "perfId": "10229226725343", "round": "Match 88",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  89, "perfId": "10229226725345", "round": "Match 89",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  90, "perfId": "10229226725346", "round": "Match 90",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  91, "perfId": "10229226725347", "round": "Match 91",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum":  92, "perfId": "10229226725348", "round": "Match 92",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  93, "perfId": "10229226725349", "round": "Match 93",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  94, "perfId": "10229226725350", "round": "Match 94",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  95, "perfId": "10229226725351", "round": "Match 95",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  96, "perfId": "10229226725352", "round": "Match 96",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507810"]},
  {"matchNum":  97, "perfId": "10229226725353", "round": "Match 97",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507808","10229966507810","10229967681124"]},
  {"matchNum":  98, "perfId": "10229226725354", "round": "Match 98",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810"]},
  {"matchNum":  99, "perfId": "10229226725355", "round": "Match 99",  "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810"]},
  {"matchNum": 100, "perfId": "10229226725356", "round": "Match 100", "advIds": ["10229516236677","10229516236679","10229893994049","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum": 101, "perfId": "10229226725357", "round": "Match 101", "advIds": ["10229516236677","10229516236679","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum": 102, "perfId": "10229226725358", "round": "Match 102", "advIds": ["10229516236677","10229516236679","10229966499828","10229966507807","10229966507808","10229966507810"]},
  {"matchNum": 103, "perfId": "10229226725361", "round": "Match 103", "advIds": ["10229516236677","10229516236679","10229966499828","10229966507807","10229966507810","10229967681124"]},
  {"matchNum": 104, "perfId": "10229226725360", "round": "Match 104", "advIds": ["10229516236677","10229893994049","10229966499828","10229966507808","10229966507810"]},
]


def _load_cookie_str(session: requests.Session, cookie_str: str) -> None:
    """Parse a 'name=value; name=value' cookie string into the session."""
    for part in cookie_str.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            for domain in [".fwc26-resale-usd.tickets.fifa.com", ".tickets.fifa.com", ".fifa.com"]:
                session.cookies.set(k.strip(), v.strip(), domain=domain)


def _find_chrome_profile_with_fifa_cookies() -> str | None:
    """Scan all Chrome profiles and return the Cookies DB path that has FIFA cookies."""
    base = Path.home() / "Library/Application Support/Google/Chrome"
    profiles = ["Default"] + [f"Profile {i}" for i in range(1, 10)]
    for profile in profiles:
        db = base / profile / "Cookies"
        if not db.exists():
            continue
        try:
            with sqlite3.connect(db) as con:
                count = con.execute("SELECT COUNT(*) FROM cookies WHERE host_key LIKE '%fifa%'").fetchone()[0]
            if count > 0:
                log.info(f"Found {count} FIFA cookies in Chrome {profile}")
                return str(db)
        except Exception:
            pass
    return None


def get_session_with_cookies() -> requests.Session:
    """
    Returns a requests.Session with FIFA auth cookies. Sources tried in order:
      1. browser_cookie3     — auto-loads from the Chrome profile that has FIFA cookies
      2. scripts/cookie.txt  — fallback if browser_cookie3 fails (prompts user to update it)
      3. Interactive prompt  — last resort
    """
    session = requests.Session(impersonate=_IMPERSONATE) if _IMPERSONATE else requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": BASE_URL + "/",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "Upgrade-Insecure-Requests": "1",
    })

    # ── Source 1: browser_cookie3 (auto-detects correct Chrome profile) ──────
    if _HAS_BROWSER_COOKIE3:
        try:
            cookie_file = _find_chrome_profile_with_fifa_cookies()
            domains = [".fifa.com", ".tickets.fifa.com", ".fwc26-resale-usd.tickets.fifa.com"]
            before = len(session.cookies)
            for domain in domains:
                kwargs = {"domain_name": domain}
                if cookie_file:
                    kwargs["cookie_file"] = cookie_file
                session.cookies.update(browser_cookie3.chrome(**kwargs))
            total = len(session.cookies) - before
            log.info(f"Loaded {total} cookies from Chrome via browser_cookie3.")
            if total > 0:
                log.info(f"Loaded {total} cookies from Chrome via browser_cookie3.")
                return session
            log.warning("browser_cookie3 returned 0 cookies — falling back to cookie.txt.")
        except Exception as e:
            log.warning(f"browser_cookie3 failed: {e} — falling back to cookie.txt.")

    # ── Source 2: cookie.txt ─────────────────────────────────────────────────
    if COOKIE_FILE.exists():
        cookie_str = COOKIE_FILE.read_text().strip()
        if cookie_str:
            _load_cookie_str(session, cookie_str)
            log.info(f"Loaded cookies from {COOKIE_FILE}")
            return session

    # ── Source 3: interactive prompt ─────────────────────────────────────────
    print("\n" + "="*60)
    print("ACTION REQUIRED: Copy cookies from Chrome DevTools")
    print("="*60)
    print(f"""
browser_cookie3 couldn't load cookies automatically (Chrome 127+ encryption change).

Steps to get cookies manually:
1. Open Chrome → https://fwc26-resale-usd.tickets.fifa.com
2. Open DevTools (Cmd+Option+I) → Network tab
3. Refresh the page (Cmd+R)
4. Click the first request in the list
5. Headers panel → Request Headers → find "cookie:"
6. Copy everything after "cookie: " and paste below.

TIP: To skip this prompt next time, save the cookie string to:
     {COOKIE_FILE}
""")
    cookie_str = input("> ").strip()
    _load_cookie_str(session, cookie_str)
    return session


def build_url(perf_id: str, adv_ids: list[str]) -> str:
    adv_str = ",".join(adv_ids)
    return (
        f"{BASE_URL}/secure/selection/event/seat/performance/{perf_id}"
        f"/contact-advantages/{adv_str}/table/1/lang/{LANG}"
    )


def _get_cat_id(row) -> str | None:
    cat_class = next((c for c in row.get("class", []) if c.startswith("v2-seatcat_")), None)
    return cat_class.replace("v2-seatcat_", "") if cat_class else None


def parse_price(text: str) -> float | None:
    """Parse '5,290.00 USD' → 5290.0"""
    if not text:
        return None
    cleaned = text.strip().replace(",", "").split()[0]
    try:
        return float(cleaned)
    except ValueError:
        return None


def extract_prices_from_html(html: str) -> dict:
    """
    Parse the table HTML and return:
    {
      "Category 1": {"bestPrice": 5290.0, "maxPrice": 25300.0, "catId": "..."},
      "Category 2": {...},
      ...
    }
    """
    soup = BeautifulSoup(html, "html.parser")
    categories = {}

    for row in soup.select("tr.group_start"):
        cat_id = _get_cat_id(row)
        if not cat_id:
            continue
        name_el = row.select_one("th.category")
        cat_name = name_el.get_text(strip=True) if name_el else f"Unknown ({cat_id})"
        if TARGET_CATEGORIES and cat_name not in TARGET_CATEGORIES:
            continue
        categories[cat_id] = {"name": cat_name, "catId": cat_id, "bestPrice": None, "maxPrice": None}

    for row in soup.select("tbody tr"):
        cat_id = _get_cat_id(row)
        if not cat_id or cat_id not in categories:
            continue
        min_price = parse_price(row.select_one(".resale_min") and row.select_one(".resale_min").get_text())
        max_price = parse_price(row.select_one(".resale_max") and row.select_one(".resale_max").get_text())
        cat = categories[cat_id]
        if min_price is not None and (cat["bestPrice"] is None or min_price < cat["bestPrice"]):
            cat["bestPrice"] = min_price
        if max_price is not None and (cat["maxPrice"] is None or max_price > cat["maxPrice"]):
            cat["maxPrice"] = max_price

    return {c["name"]: c for c in categories.values() if c["bestPrice"] is not None}


def scrape_all_matches(session: requests.Session, matches: list[dict]) -> dict:
    results = {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "currency": "USD",
        "source": BASE_URL,
        "matches": {}
    }

    for i, match in enumerate(matches):
        match_key = f"Match {match['matchNum']}"
        log.info(f"[{i+1}/{len(matches)}] Fetching {match_key} (perfId={match['perfId']})...")

        url = build_url(match["perfId"], match["advIds"])
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 200:
                prices = extract_prices_from_html(resp.text)
                results["matches"][match_key] = {
                    "perfId": match["perfId"],
                    "round": match["round"],
                    "categories": prices
                }
                cat_summary = {k: v["bestPrice"] for k, v in prices.items() if "Category" in k}
                log.info(f"  → {cat_summary}")
            elif resp.status_code == 302:
                log.warning(f"  → Redirected (session expired?). Skipping.")
                results["matches"][match_key] = {"error": "redirected/session_expired"}
            else:
                log.warning(f"  → HTTP {resp.status_code}. Skipping.")
                results["matches"][match_key] = {"error": f"http_{resp.status_code}"}
        except Exception as e:
            log.error(f"  → Error: {e}")
            results["matches"][match_key] = {"error": str(e)}

        if i < len(matches) - 1:
            time.sleep(REQUEST_DELAY_SECS)

    return results


OUTPUT_FILE = Path(__file__).parent.parent / "src/data/fifa-marketplace-values-latest.json"
KV_KEY = "fifa:resale-prices"


def _load_env(path: Path) -> dict:
    """Parse a .env file into a dict (no dependencies required)."""
    env = {}
    if not path.exists():
        return env
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')
    return env


def push_to_kv(results: dict) -> None:
    """Push scraped results to Upstash KV via REST API."""
    import os
    env = {**_load_env(Path(__file__).parent.parent / ".env.local"), **os.environ}
    url = env.get("KV_REST_API_URL")
    token = env.get("KV_REST_API_TOKEN")
    if not url or not token:
        log.warning("KV_REST_API_URL / KV_REST_API_TOKEN not set — skipping KV push.")
        return
    try:
        payload = json.dumps(results)
        kwargs = dict(
            content=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30,
        )
        if _IMPERSONATE:
            kwargs["impersonate"] = _IMPERSONATE
        resp = requests.post(f"{url}/set/{KV_KEY}", **kwargs)
        if resp.status_code == 200:
            log.info(f"Pushed to KV → {KV_KEY} ({len(payload):,} bytes)")
        else:
            log.warning(f"KV push failed: HTTP {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        log.warning(f"KV push error: {e}")


def save_results(results: dict) -> Path:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)
    log.info(f"Saved → {OUTPUT_FILE}")
    push_to_kv(results)
    return OUTPUT_FILE


def main():
    log.info("FIFA WC2026 Resale Price Scraper")
    log.info(f"Total matches to scrape: {len(ALL_MATCHES)}")

    session = get_session_with_cookies()

    # Auth check — catches expired sessions before the full 104-match run
    test_resp = session.get(f"{BASE_URL}/secured/list/events", timeout=15, allow_redirects=False)
    if test_resp.status_code in (301, 302):
        log.error("Session appears expired or not logged in. Please log in to Chrome first.")
        return

    results = scrape_all_matches(session, ALL_MATCHES)

    save_results(results)
    log.info(f"Done! Scraped {len(results['matches'])} matches → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()