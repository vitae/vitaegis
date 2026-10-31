"""Kalshi KXBTC15M contrarian bot.

Watches the soonest-closing 15-minute Bitcoin market and buys the cheap side
when the crowd is heavy on the other side (entry between MIN and MAX cents).

Runs in dry-run mode unless --live is passed. Requires `requests` and
`cryptography` (pip install requests cryptography).

Environment:
  KALSHI_KEY_ID             API key id (required)
  KALSHI_PRIVATE_KEY_PATH   RSA private key PEM, default kalshi_private.key
  KALSHI_HOST               default https://external-api.kalshi.com
  KALSHI_SERIES             default KXBTC15M
  KALSHI_BET_USD            default 10
  KALSHI_MAX_ENTRY_CENTS    default 28
  KALSHI_MIN_ENTRY_CENTS    default 8
  KALSHI_MAX_ORDERS_PER_DAY default 6
  KALSHI_POLL_SECONDS       default 15
  KALSHI_TIME_IN_FORCE      immediate_or_cancel (default) | good_till_canceled | fill_or_kill

Optional telemetry for /admin/kalshi on vitaegis.com (skipped when unset):
  SUPABASE_URL              project URL (NEXT_PUBLIC_SUPABASE_URL also accepted)
  SUPABASE_SERVICE_ROLE_KEY service role key; rows go to the kalshi_events table
"""

from __future__ import annotations

import argparse
import base64
import logging
import os
import sys
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

API_PREFIX = "/trade-api/v2"
log = logging.getLogger("kalshi_bot")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Config:
    key_id: str
    private_key_path: str
    host: str
    series_ticker: str
    bet_usd: Decimal
    max_entry_cents: int
    min_entry_cents: int
    max_orders_per_day: int
    poll_seconds: int
    time_in_force: str
    live: bool

    @classmethod
    def from_env(cls, live: bool) -> "Config":
        env = os.environ.get
        cfg = cls(
            key_id=env("KALSHI_KEY_ID", ""),
            private_key_path=env("KALSHI_PRIVATE_KEY_PATH", "kalshi_private.key"),
            host=env("KALSHI_HOST", "https://external-api.kalshi.com").rstrip("/"),
            series_ticker=env("KALSHI_SERIES", "KXBTC15M"),
            bet_usd=Decimal(env("KALSHI_BET_USD", "10")),
            max_entry_cents=int(env("KALSHI_MAX_ENTRY_CENTS", "28")),
            min_entry_cents=int(env("KALSHI_MIN_ENTRY_CENTS", "8")),
            max_orders_per_day=int(env("KALSHI_MAX_ORDERS_PER_DAY", "6")),
            poll_seconds=int(env("KALSHI_POLL_SECONDS", "15")),
            time_in_force=env("KALSHI_TIME_IN_FORCE", "immediate_or_cancel"),
            live=live,
        )
        if not 1 <= cfg.min_entry_cents <= cfg.max_entry_cents <= 99:
            raise ValueError("entry bounds must satisfy 1 <= min <= max <= 99 cents")
        if cfg.time_in_force not in {"immediate_or_cancel", "good_till_canceled", "fill_or_kill"}:
            raise ValueError(f"unsupported KALSHI_TIME_IN_FORCE: {cfg.time_in_force}")
        return cfg


# ---------------------------------------------------------------------------
# Kalshi client
# ---------------------------------------------------------------------------
class KalshiError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"HTTP {status}: {body[:300]}")
        self.status = status


class KalshiClient:
    """Thin authenticated REST client. Signs ts + METHOD + path (no query)."""

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.session = requests.Session()
        self._private_key = None

    def _key(self):
        if self._private_key is None:
            with open(self.cfg.private_key_path, "rb") as f:
                self._private_key = serialization.load_pem_private_key(f.read(), password=None)
        return self._private_key

    def _auth_headers(self, method: str, path: str) -> dict[str, str]:
        ts = str(int(time.time() * 1000))
        message = (ts + method.upper() + path).encode()
        signature = self._key().sign(
            message,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH),
            hashes.SHA256(),
        )
        return {
            "KALSHI-ACCESS-KEY": self.cfg.key_id,
            "KALSHI-ACCESS-TIMESTAMP": ts,
            "KALSHI-ACCESS-SIGNATURE": base64.b64encode(signature).decode(),
        }

    def request(self, method: str, route: str, *, params=None, json=None, auth=True) -> dict[str, Any]:
        path = API_PREFIX + route
        headers = {"Content-Type": "application/json"}
        if auth:
            headers.update(self._auth_headers(method, path))
        resp = self.session.request(method, self.cfg.host + path, params=params, json=json, headers=headers, timeout=10)
        if resp.status_code >= 400:
            raise KalshiError(resp.status_code, resp.text)
        return resp.json()

    def balance_cents(self) -> int:
        return int(self.request("GET", "/portfolio/balance")["balance"])

    def open_markets(self, series_ticker: str) -> list[dict[str, Any]]:
        data = self.request("GET", "/markets", params={"series_ticker": series_ticker, "status": "open", "limit": 100}, auth=False)
        return data.get("markets", [])

    def buy(self, ticker: str, outcome: str, price_cents: int, count: int) -> dict[str, Any]:
        """Buy `count` YES or NO contracts at `price_cents`.

        V2 orders are expressed on the YES book: buying NO at q is an `ask`
        (sell YES) at 100 - q.
        """
        if outcome == "yes":
            side, book_cents = "bid", price_cents
        elif outcome == "no":
            side, book_cents = "ask", 100 - price_cents
        else:
            raise ValueError(outcome)
        body = {
            "ticker": ticker,
            "side": side,
            "count": str(count),
            "price": f"{book_cents / 100:.4f}",
            "time_in_force": self.cfg.time_in_force,
            "self_trade_prevention_type": "taker_at_cross",
            "client_order_id": str(uuid.uuid4()),
        }
        return self.request("POST", "/portfolio/events/orders", json=body)


# ---------------------------------------------------------------------------
# Telemetry sink (optional)
# ---------------------------------------------------------------------------
class SupabaseSink:
    """Writes kalshi_events rows on a background thread so trading never waits on it."""

    def __init__(self, url: str | None, key: str | None):
        self.url = url.rstrip("/") + "/rest/v1/kalshi_events" if url else None
        self.key = key
        self.session = requests.Session()

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.key)

    def write(self, kind: str, **fields: Any) -> None:
        if not self.enabled:
            return
        row = {"kind": kind, **{k: v for k, v in fields.items() if v is not None}}
        threading.Thread(target=self._post, args=(row,), daemon=True).start()

    def _post(self, row: dict[str, Any]) -> None:
        try:
            resp = self.session.post(
                self.url,
                json=row,
                timeout=5,
                headers={
                    "apikey": self.key,
                    "Authorization": f"Bearer {self.key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
            )
            if resp.status_code >= 400:
                log.warning("telemetry rejected: HTTP %s %s", resp.status_code, resp.text[:120])
        except requests.RequestException as e:
            log.warning("telemetry failed: %s", e)


# ---------------------------------------------------------------------------
# Pure helpers (no I/O)
# ---------------------------------------------------------------------------
def dollars_to_cents(value: str | None) -> int | None:
    """'0.2800' -> 28. Returns None for missing or empty-book values."""
    if value in (None, ""):
        return None
    cents = int((Decimal(value) * 100).to_integral_value())
    return cents if 1 <= cents <= 99 else None


def _int_or_none(value: Any) -> int | None:
    """'35.00' -> 35 for Kalshi fixed-point counts."""
    try:
        return int(Decimal(str(value))) if value not in (None, "") else None
    except (ValueError, ArithmeticError):
        return None


def parse_iso_ms(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000


def pick_market(markets: list[dict[str, Any]], now_ms: float) -> dict[str, Any] | None:
    """Soonest-closing market that is still open."""
    live = [m for m in markets if parse_iso_ms(m["close_time"]) > now_ms]
    return min(live, key=lambda m: parse_iso_ms(m["close_time"])) if live else None


def find_entry(yes_ask: int | None, no_ask: int | None, cfg: Config) -> tuple[str, int] | None:
    """Return (outcome, price_cents) when the cheap side is in the entry zone."""
    if yes_ask is None or no_ask is None:
        return None
    heavy = 100 - cfg.max_entry_cents
    if yes_ask >= heavy and cfg.min_entry_cents <= no_ask <= cfg.max_entry_cents:
        return "no", no_ask
    if no_ask >= heavy and cfg.min_entry_cents <= yes_ask <= cfg.max_entry_cents:
        return "yes", yes_ask
    return None


def contracts_for(bet_usd: Decimal, price_cents: int) -> int:
    return int((bet_usd * 100) // price_cents)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
class Bot:
    HEARTBEAT_SECONDS = 60

    def __init__(self, cfg: Config, client: KalshiClient, sink: SupabaseSink | None = None):
        self.cfg = cfg
        self.client = client
        self.sink = sink or SupabaseSink(None, None)
        self.traded: set[str] = set()
        self.orders_today = 0
        self.today = date.today()
        self._last_quote: tuple[str, int | None, int | None] | None = None
        self._last_logged = 0.0

    def tick(self) -> None:
        if date.today() != self.today:
            self.today, self.orders_today = date.today(), 0

        market = pick_market(self.client.open_markets(self.cfg.series_ticker), time.time() * 1000)
        if market is None:
            log.info("no open %s market", self.cfg.series_ticker)
            return

        ticker = market["ticker"]
        yes_ask = dollars_to_cents(market.get("yes_ask_dollars"))
        no_ask = dollars_to_cents(market.get("no_ask_dollars"))
        close_in = int((parse_iso_ms(market["close_time"]) - time.time() * 1000) / 1000)
        log.info("%s closes in %ds | YES ask %s¢ | NO ask %s¢", ticker, close_in, yes_ask, no_ask)

        quote = (ticker, yes_ask, no_ask)
        if quote != self._last_quote or time.time() - self._last_logged >= self.HEARTBEAT_SECONDS:
            self._last_quote, self._last_logged = quote, time.time()
            self.sink.write("tick", live=self.cfg.live, ticker=ticker, close_time=market["close_time"], yes_ask_cents=yes_ask, no_ask_cents=no_ask)

        if ticker in self.traded:
            return
        if self.orders_today >= self.cfg.max_orders_per_day:
            log.warning("daily order cap (%d) reached", self.cfg.max_orders_per_day)
            return

        entry = find_entry(yes_ask, no_ask, self.cfg)
        if entry is None:
            return
        outcome, price = entry
        count = contracts_for(self.cfg.bet_usd, price)
        if count < 1:
            return

        mode = "LIVE" if self.cfg.live else "DRY-RUN"
        log.info("[%s] buy %dx %s @ %d¢ on %s", mode, count, outcome.upper(), price, ticker)
        self.traded.add(ticker)
        self.orders_today += 1
        result: dict[str, Any] = {}
        if self.cfg.live:
            result = self.client.buy(ticker, outcome, price, count)
            log.info("order %s filled %s remaining %s avg %s", result.get("order_id"), result.get("fill_count"), result.get("remaining_count"), result.get("average_fill_price"))
        self.sink.write(
            "order",
            live=self.cfg.live,
            ticker=ticker,
            close_time=market["close_time"],
            yes_ask_cents=yes_ask,
            no_ask_cents=no_ask,
            outcome=outcome,
            price_cents=price,
            count=count,
            order_id=result.get("order_id"),
            fill_count=_int_or_none(result.get("fill_count")),
            remaining_count=_int_or_none(result.get("remaining_count")),
            avg_fill_cents=dollars_to_cents(result.get("average_fill_price")),
        )

    def run_forever(self) -> None:
        backoff = self.cfg.poll_seconds
        while True:
            try:
                self.tick()
                backoff = self.cfg.poll_seconds
            except KalshiError as e:
                log.error("kalshi: %s", e)
                self.sink.write("error", live=self.cfg.live, message=str(e))
                backoff = min(backoff * 2, 300) if e.status == 429 else self.cfg.poll_seconds
            except requests.RequestException as e:
                log.error("network: %s", e)
                self.sink.write("error", live=self.cfg.live, message=f"network: {e}")
            time.sleep(backoff)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--live", action="store_true", help="place real orders (default: dry run)")
    parser.add_argument("--once", action="store_true", help="run a single tick and exit")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    cfg = Config.from_env(live=args.live)
    client = KalshiClient(cfg)
    sink = SupabaseSink(
        os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL"),
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY"),
    )
    log.info("telemetry %s", "on" if sink.enabled else "off (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)")

    balance = None
    if cfg.live:
        if not cfg.key_id:
            log.error("KALSHI_KEY_ID is required for --live")
            return 2
        balance = client.balance_cents()
        log.info("auth ok, balance $%.2f", balance / 100)
    else:
        log.info("dry run: no orders will be placed (pass --live to trade)")
    sink.write("status", live=cfg.live, balance_cents=balance, message="started")

    bot = Bot(cfg, client, sink)
    if args.once:
        try:
            bot.tick()
        except (KalshiError, requests.RequestException) as e:
            log.error("%s", e)
            return 1
        return 0
    try:
        bot.run_forever()
    except KeyboardInterrupt:
        log.info("stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
