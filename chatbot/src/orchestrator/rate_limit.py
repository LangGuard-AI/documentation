"""DynamoDB-backed rate limiting + spend cap.

Counters are atomic ADDs on TTL'd keys — pennies at chatbot scale. Two guards,
both applied before any Bedrock call:

  1. allow_request  — request rate (per-IP hourly + global daily turn ceiling).
  2. budget_ok      — actual dollar spend (monthly + daily Bedrock cost cap).

API Gateway stage throttling sits in front of both as the blunt flood control.
After each turn the caller calls record_cost() with the turn's real token usage,
so budget_ok enforces a hard monthly dollar ceiling — the thing AWS Budgets
cannot do in real time.

Fail-open: a DynamoDB hiccup should degrade to "no limiting", not an outage.
"""
from __future__ import annotations

import hashlib
import os
import time

PER_IP_HOURLY_LIMIT = int(os.environ.get("RATE_LIMIT_PER_IP_HOUR", "30"))
GLOBAL_DAILY_LIMIT = int(os.environ.get("RATE_LIMIT_GLOBAL_DAY", "500"))
_SALT = os.environ.get("RATE_SALT", "langguard-docs-chatbot")

# Spend cap. Cost is accumulated in integer MICRODOLLARS (1 USD = 1_000_000) so
# DynamoDB only ever does integer ADDs — no float drift. Per-million-token prices
# default to Amazon Nova Pro on-demand (us-west-2); override via env if the model
# or price changes. microdollars(tok) = tokens * price_per_million (see _micros).
PRICE_IN_PER_M = float(os.environ.get("BEDROCK_PRICE_IN_PER_M", "0.80"))
PRICE_OUT_PER_M = float(os.environ.get("BEDROCK_PRICE_OUT_PER_M", "3.20"))
MONTHLY_USD_CAP = float(os.environ.get("COST_CAP_MONTH_USD", "20"))
DAILY_USD_CAP = float(os.environ.get("COST_CAP_DAY_USD", "4"))
_USD = 1_000_000  # microdollars per dollar


def ip_hash(ip: str) -> str:
    return hashlib.sha256(f"{_SALT}:{ip}".encode()).hexdigest()[:16]


def check_and_increment(table, key: str, limit: int, ttl_seconds: int) -> bool:
    """Atomically increment a counter; True if still within `limit`."""
    try:
        resp = table.update_item(
            Key={"pk": key},
            UpdateExpression="ADD #c :one SET #t = if_not_exists(#t, :exp)",
            ExpressionAttributeNames={"#c": "count", "#t": "ttl"},
            ExpressionAttributeValues={":one": 1, ":exp": int(time.time() + ttl_seconds)},
            ReturnValues="UPDATED_NEW",
        )
        return int(resp["Attributes"]["count"]) <= limit
    except Exception as exc:  # fail-open by design
        print(f"rate_limit: DynamoDB error (failing open): {exc}")
        return True


def allow_request(table, ip: str) -> bool:
    """Per-IP hourly window + global daily ceiling."""
    hour = time.strftime("%Y%m%d%H", time.gmtime())
    day = time.strftime("%Y%m%d", time.gmtime())
    if not check_and_increment(table, f"ip#{ip_hash(ip)}#{hour}", PER_IP_HOURLY_LIMIT, 7200):
        return False
    if not check_and_increment(table, f"global#{day}", GLOBAL_DAILY_LIMIT, 172800):
        return False
    return True


def _micros(in_tok: int, out_tok: int) -> int:
    """Bedrock token usage -> integer microdollars.

    tokens * (price_per_million / 1e6) USD = tokens * price_per_million microdollars,
    since 1 USD = 1e6 microdollars. So the /1e6 and *1e6 cancel — exact integer math.
    """
    return int(round(in_tok * PRICE_IN_PER_M + out_tok * PRICE_OUT_PER_M))


def _spent_micros(table, key: str) -> int:
    resp = table.get_item(Key={"pk": key})
    item = resp.get("Item")
    return int(item["micros"]) if item and "micros" in item else 0


def budget_ok(table, now: float = None) -> bool:
    """True if this month's AND today's accumulated Bedrock spend are under cap.

    Read-only (the actual spend is recorded post-turn by record_cost). Checked
    before any Bedrock call, so once the month hits MONTHLY_USD_CAP no further
    model calls happen — a hard dollar ceiling. Fail-open on DynamoDB error.
    """
    t = time.gmtime(now if now is not None else time.time())
    month, day = time.strftime("%Y%m", t), time.strftime("%Y%m%d", t)
    try:
        if _spent_micros(table, f"cost#{month}") >= MONTHLY_USD_CAP * _USD:
            print(f"rate_limit: monthly spend cap ${MONTHLY_USD_CAP} reached for {month}")
            return False
        if _spent_micros(table, f"cost#{day}") >= DAILY_USD_CAP * _USD:
            print(f"rate_limit: daily spend cap ${DAILY_USD_CAP} reached for {day}")
            return False
        return True
    except Exception as exc:  # fail-open by design
        print(f"rate_limit: budget check error (failing open): {exc}")
        return True


def record_cost(table, in_tok: int, out_tok: int, now: float = None) -> None:
    """Atomically add a turn's actual Bedrock cost to the month + day counters.

    Non-fatal: a write failure just means that turn isn't counted (the next
    budget_ok still sees prior spend). Months/days TTL out on their own.
    """
    micros = _micros(int(in_tok or 0), int(out_tok or 0))
    if micros <= 0:
        return
    t = time.gmtime(now if now is not None else time.time())
    month, day = time.strftime("%Y%m", t), time.strftime("%Y%m%d", t)
    for key, ttl in ((f"cost#{month}", 70 * 86400), (f"cost#{day}", 3 * 86400)):
        try:
            table.update_item(
                Key={"pk": key},
                UpdateExpression="ADD micros :m SET #t = if_not_exists(#t, :exp)",
                ExpressionAttributeNames={"#t": "ttl"},
                ExpressionAttributeValues={":m": micros, ":exp": int(time.time()) + ttl},
            )
        except Exception as exc:
            print(f"rate_limit: cost record error for {key} (non-fatal): {exc}")
