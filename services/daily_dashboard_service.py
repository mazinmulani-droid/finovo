"""Aggregated daily market summary with TTL cache in DB."""

from __future__ import annotations

import concurrent.futures
import logging
import time
from datetime import datetime, timezone

import yfinance as yf

from models.db_models import DailySummaryCache
from config import get_gemini_api_key
from services import gemini_service, market_service, news_service
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_CACHE_SECONDS = 30 * 60
_BENCH = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "SBIN.NS", "ITC.NS"]

_MEM_CACHE: dict | None = None
_MEM_CACHE_TIME: float = 0


def _utc_day_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _fetch_one_symbol(sym: str) -> dict | None:
    try:
        t = yf.Ticker(sym)
        h = t.history(period="5d")
        if h is None or len(h) < 2:
            return None
        c0 = float(h["Close"].iloc[-2])
        c1 = float(h["Close"].iloc[-1])
        pct = (c1 - c0) / c0 * 100 if c0 else 0
        return {"symbol": sym, "pct_change": round(pct, 2), "last": round(c1, 2)}
    except Exception as e:
        logger.debug("bench %s: %s", sym, e)
        return None


def _moves_from_yahoo() -> tuple[list[dict], list[dict]]:
    gainers: list[dict] = []
    losers: list[dict] = []
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(_BENCH)) as ex:
            results = list(ex.map(_fetch_one_symbol, _BENCH, timeout=4))
        for row in results:
            if not row:
                continue
            if row["pct_change"] >= 0:
                gainers.append(row)
            else:
                losers.append(row)
    except Exception as e:
        logger.warning("Parallel benchmark fetch failed: %s", e)

    gainers.sort(key=lambda x: x["pct_change"], reverse=True)
    losers.sort(key=lambda x: x["pct_change"])
    return gainers[:5], losers[:5]


def build_daily_summary(db: Session, force_refresh: bool = False) -> dict:
    global _MEM_CACHE, _MEM_CACHE_TIME
    day_key = _utc_day_key()

    # Fast in-memory cache check (instant response)
    now_ts = time.time()
    if not force_refresh and _MEM_CACHE and (now_ts - _MEM_CACHE_TIME < _CACHE_SECONDS):
        if _MEM_CACHE.get("day_key") == day_key:
            return _MEM_CACHE

    row = db.query(DailySummaryCache).filter(DailySummaryCache.day_key == day_key).first()
    if row and not force_refresh and row.created_at is not None:
        created = row.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - created).total_seconds()
        if age < _CACHE_SECONDS:
            _MEM_CACHE = row.payload
            _MEM_CACHE_TIME = now_ts
            return row.payload

    fii_dii = market_service.fetch_market_triggers()
    headlines = news_service.fetch_headlines_for_query("Indian stock market", 8)
    gainers, losers = _moves_from_yahoo()

    mood = "Neutral"
    if gainers and losers:
        avg_g = sum(g["pct_change"] for g in gainers[:3]) / min(3, len(gainers))
        avg_l = sum(abs(l["pct_change"]) for l in losers[:3]) / min(3, len(losers))
        if avg_g > avg_l * 1.2:
            mood = "Risk-on"
        elif avg_l > avg_g * 1.2:
            mood = "Cautious"

    top_opp = gainers[0]["symbol"] if gainers else "—"
    top_risk = losers[0]["symbol"] if losers else "—"

    ai_summary = ""
    opportunity = f"Top momentum leader: {top_opp}."
    risk = f"Downside pressure observed in: {top_risk}."

    if get_gemini_api_key() and headlines:
        try:
            hl = "\n".join(f"- {h}" for h in headlines[:6])
            prompt = f"""You are a concise Indian equity market assistant. Based on these headlines and a {mood} mood:
{hl}

Write 3 short sentences: (1) overall mood, (2) one opportunity, (3) one risk. Plain English, no investment advice."""
            ai_summary = gemini_service.generate_text(prompt, context="daily_summary").strip()
        except Exception as e:
            logger.warning("daily AI summary skipped: %s", e)
            ai_summary = ""

    if not ai_summary:
        if mood == "Risk-on":
            ai_summary = (
                f"Market sentiment is resilient and risk-on today, led by strong buying interest in {top_opp}. "
                f"Breadth remains favorable for trend-following and momentum breakout setups across large-cap leaders. "
                f"Keep an eye on {top_risk} for potential resistance or sector rotation."
            )
        elif mood == "Cautious":
            ai_summary = (
                f"Market posture remains defensive and cautious as selling pressure in {top_risk} weighs on index breadth. "
                f"Defensive strength is seen in selective counters like {top_opp}, showing relative outperformance. "
                f"Maintain strict risk management and wait for confirmation before aggressive new positions."
            )
        else:
            ai_summary = (
                f"Equities are exhibiting two-way consolidation with balanced market breadth across benchmark indices. "
                f"Momentum focus remains stock-specific, with {top_opp} leading gains and {top_risk} showing profit taking. "
                f"Ideal environment for selective swing trading with tight stop-losses."
            )

    payload = {
        "day_key": day_key,
        "market_mood": mood,
        "fii_dii": fii_dii,
        "headlines": headlines,
        "top_gainers": gainers,
        "top_losers": losers,
        "trending_sectors": [],
        "ai_summary": ai_summary,
        "top_opportunity": opportunity,
        "top_risk": risk,
    }

    if row:
        row.payload = payload
        row.created_at = datetime.now(timezone.utc)
    else:
        db.add(DailySummaryCache(day_key=day_key, payload=payload))
    try:
        db.commit()
    except Exception as e:
        logger.warning("daily cache commit: %s", e)
        db.rollback()
    _MEM_CACHE = payload
    _MEM_CACHE_TIME = time.time()
    return payload
