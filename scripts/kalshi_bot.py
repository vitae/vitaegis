"""Kalshi KXBTC15M contrarian bot.

Watches the soonest-closing 15-minute Bitcoin market and buys the cheap side
when the crowd is heavy on the other side (entry between MIN and MAX cents).
After each market closes it looks up the result, records realized profit on
every order, and stores the market's quote path so /kalshi can backtest other
entry thresholds.

Quotes stream in over Kalshi's WebSocket ticker channel when an API key is
configured (the `websockets` package is needed), with a REST poll every
KALSHI_POLL_SECONDS to discover the next market and reconcile. Every quote
change is broadcast to the Supabase Realtime topic `kalshi` so vitaegis.com/kalshi
updates the moment the book moves.

Runs in dry-run mode unless --live is passed. Requires `requests` and
`cryptography` (pip install -r scripts/kalshi-requirements.txt).

Environment:
  KALSHI_KEY_ID             API key id (required for --live)
  KALSHI_PRIVATE_KEY_PATH   RSA private key PEM, default kalshi_private.key
  KALSHI_HOST               default https://external-api.kalshi.com
  KALSHI_WS_HOST            default wss://external-api-ws.kalshi.com
  KALSHI_SERIES             default KXBTC15M
  KALSHI_BET_USD            default 10
  KALSHI_MAX_ENTRY_CENTS    default 28
  KALSHI_MIN_ENTRY_CENTS    default 8
  KALSHI_MAX_ORDERS_PER_DAY default 6
  KALSHI_POLL_SECONDS       default 15
  KALSHI_TIME_IN_FORCE      immediate_or_cancel (default) | good_till_canceled | fill_or_kill
  KALSHI_SETTLE_GRACE_SECONDS   wait after close before asking for the result, default 120
  KALSHI_SETTLE_TIMEOUT_SECONDS give up on a result after this long, default 21600

Optional telemetry for vitaegis.com/kalshi (skipped when unset):
  SUPABASE_URL              project URL (NEXT_PUBLIC_SUPABASE_URL also accepted)
  SUPABASE_SERVICE_ROLE_KEY service role key; rows go to the kalshi_events table
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import logging
import math
import os
import queue
import sys
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

try:
    import websockets
except ImportError:  # the feed is optional; polling still works
    websockets = None

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
    ws_host: str
    series_ticker: str
    bet_usd: Decimal
    max_entry_cents: int
    min_entry_cents: int
    max_orders_per_day: int
    poll_seconds: int
    time_in_force: str
    settle_grace_seconds: int
    settle_timeout_seconds: int
    live: bool

    @classmethod
    def from_env(cls, live: bool) -> "Config":
        env = os.environ.get
        cfg = cls(
            key_id=env("KALSHI_KEY_ID", ""),
            private_key_path=env("KALSHI_PRIVATE_KEY_PATH", "kalshi_private.key"),
            host=env("KALSHI_HOST", "https://external-api.kalshi.com").rstrip("/"),
            ws_host=env("KALSHI_WS_HOST", "wss://external-api-ws.kalshi.com").rstrip("/"),
            series_ticker=env("KALSHI_SERIES", "KXBTC15M"),
            bet_usd=Decimal(env("KALSHI_BET_USD", "10")),
            max_entry_cents=int(env("KALSHI_MAX_ENTRY_CENTS", "28")),
            min_entry_cents=int(env("KALSHI_MIN_ENTRY_CENTS", "8")),
            max_orders_per_day=int(env("KALSHI_MAX_ORDERS_PER_DAY", "6")),
            poll_seconds=int(env("KALSHI_POLL_SECONDS", "15")),
            time_in_force=env("KALSHI_TIME_IN_FORCE", "immediate_or_cancel"),
            settle_grace_seconds=int(env("KALSHI_SETTLE_GRACE_SECONDS", "120")),
            settle_timeout_seconds=int(env("KALSHI_SETTLE_TIMEOUT_SECONDS", "21600")),
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

    def ws_headers(self, path: str) -> dict[str, str]:
        """Handshake headers for the WebSocket, signed over GET + the ws path."""
        return self._auth_headers("GET", path)

    def balance_cents(self) -> int:
        return int(self.request("GET", "/portfolio/balance")["balance"])

    def open_markets(self, series_ticker: str) -> list[dict[str, Any]]:
        data = self.request("GET", "/markets", params={"series_ticker": series_ticker, "status": "open", "limit": 100}, auth=False)
        return data.get("markets", [])

    def market(self, ticker: str) -> dict[str, Any]:
        return self.request("GET", f"/markets/{ticker}", auth=False)["market"]

    def buy(self, ticker: str, outcome: str, price_cents: int, count: int, client_order_id: str | None = None) -> dict[str, Any]:
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
            "client_order_id": client_order_id or str(uuid.uuid4()),
        }
        return self.request("POST", "/portfolio/events/orders", json=body)


# ---------------------------------------------------------------------------
# Telemetry sink (optional)
# ---------------------------------------------------------------------------
class SupabaseSink:
    """Writes kalshi_events rows on a background thread so trading never waits on it."""

    TOPIC = "kalshi"
    TICK_MIN_INTERVAL = 0.25  # coalesce bursts to at most four tick broadcasts a second

    def __init__(self, url: str | None, key: str | None):
        base = url.rstrip("/") if url else None
        self.url = base + "/rest/v1/kalshi_events" if base else None
        self.broadcast_url = base + "/realtime/v1/api/broadcast" if base else None
        self.key = key
        self.session = requests.Session()
        self._lock = threading.Lock()
        self._pending_tick: dict[str, Any] | None = None
        self._tick_timer: threading.Timer | None = None
        self._next_tick_at = 0.0

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.key)

    def write(self, kind: str, **fields: Any) -> None:
        if not self.enabled:
            return
        row = {"kind": kind, **{k: v for k, v in fields.items() if v is not None}}
        threading.Thread(target=self._send, args=("POST", self.url, row), daemon=True).start()

    def update(self, match_col: str, match_val: str, **fields: Any) -> None:
        if not self.enabled:
            return
        row = {k: v for k, v in fields.items() if v is not None}
        url = f"{self.url}?{match_col}=eq.{match_val}"
        threading.Thread(target=self._send, args=("PATCH", url, row), daemon=True).start()

    def broadcast(self, event: str, payload: dict[str, Any]) -> None:
        """Push to the Realtime topic so the page updates without polling."""
        if not self.enabled:
            return
        if event == "tick":
            with self._lock:
                self._pending_tick = payload
                wait = self._next_tick_at - time.monotonic()
                if wait > 0:
                    if self._tick_timer is None:
                        self._tick_timer = threading.Timer(wait, self._flush_tick)
                        self._tick_timer.daemon = True
                        self._tick_timer.start()
                    return
                self._next_tick_at = time.monotonic() + self.TICK_MIN_INTERVAL
                payload, self._pending_tick = self._pending_tick, None
        self._post_broadcast(event, payload)

    def _flush_tick(self) -> None:
        with self._lock:
            self._tick_timer = None
            payload, self._pending_tick = self._pending_tick, None
            self._next_tick_at = time.monotonic() + self.TICK_MIN_INTERVAL
        if payload is not None:
            self._post_broadcast("tick", payload)

    def _post_broadcast(self, event: str, payload: dict[str, Any]) -> None:
        body = {"messages": [{"topic": self.TOPIC, "event": event, "payload": payload}]}
        threading.Thread(target=self._send, args=("POST", self.broadcast_url, body), daemon=True).start()

    def _send(self, method: str, url: str, row: dict[str, Any]) -> None:
        try:
            resp = self.session.request(
                method,
                url,
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


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def kalshi_fee_cents(contracts: int, price_cents: int) -> int:
    """Kalshi's taker fee: ceil(0.07 * C * P * (1 - P)) dollars, here in cents."""
    p = price_cents / 100
    return math.ceil(7 * contracts * p * (1 - p) - 1e-9)


def pnl_cents(outcome: str, result: str, contracts: int, price_cents: int, fee_cents: int) -> int:
    """Realized profit after fees once the market settles."""
    if contracts <= 0:
        return -fee_cents
    if outcome == result:
        return contracts * (100 - price_cents) - fee_cents
    return -(contracts * price_cents) - fee_cents


# ---------------------------------------------------------------------------
# Live quotes over WebSocket (optional; needs an API key)
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Quote:
    ticker: str
    yes_ask: int | None
    no_ask: int | None
    ts_ms: int


class KalshiTicker:
    """Streams Kalshi's `ticker` channel for one market into a queue.

    Runs its own asyncio loop on a daemon thread, reconnects with backoff, and
    reconnects when the watched market changes (once per 15-minute market).
    The ticker carries YES bid and ask; NO ask is 100 - YES bid by definition.
    """

    WS_PATH = "/trade-api/ws/v2"

    def __init__(self, client: KalshiClient, out: "queue.Queue[Quote]"):
        self.client = client
        self.out = out
        self.connected = False
        self._ticker: str | None = None
        self._changed = threading.Event()
        self._thread = threading.Thread(target=lambda: asyncio.run(self._main()), daemon=True, name="kalshi-ws")

    @property
    def available(self) -> bool:
        return websockets is not None and bool(self.client.cfg.key_id)

    def start(self) -> None:
        if self.available:
            self._thread.start()
        elif websockets is None:
            log.info("ws: `websockets` not installed; polling only")
        else:
            log.info("ws: no KALSHI_KEY_ID; polling only")

    def watch(self, ticker: str) -> None:
        if ticker != self._ticker:
            self._ticker = ticker
            self._changed.set()

    async def _main(self) -> None:
        backoff = 1.0
        while True:
            ticker = self._ticker
            if ticker is None:
                await asyncio.sleep(0.5)
                continue
            self._changed.clear()
            try:
                await self._stream(ticker)
                backoff = 1.0
            except Exception as e:  # noqa: BLE001 - keep the feed alive whatever happens
                self.connected = False
                log.warning("ws: %s; reconnecting in %.0fs", e, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30.0)

    async def _stream(self, ticker: str) -> None:
        url = self.client.cfg.ws_host + self.WS_PATH
        headers = self.client.ws_headers(self.WS_PATH)
        async with websockets.connect(url, additional_headers=headers) as ws:
            await ws.send(json.dumps({"id": 1, "cmd": "subscribe", "params": {"channels": ["ticker"], "market_tickers": [ticker]}}))
            self.connected = True
            log.info("ws: streaming %s", ticker)
            while not self._changed.is_set():
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                data = json.loads(raw)
                kind = data.get("type")
                if kind == "ticker":
                    q = parse_ticker(data.get("msg") or {})
                    if q is not None and q.ticker == ticker:
                        self.out.put(q)
                elif kind == "error":
                    raise RuntimeError(f"server error {data.get('msg')}")
        self.connected = False


def parse_ticker(msg: dict[str, Any]) -> Quote | None:
    ticker = msg.get("market_ticker")
    if not ticker:
        return None
    yes_bid = dollars_to_cents(msg.get("yes_bid_dollars"))
    return Quote(
        ticker=ticker,
        yes_ask=dollars_to_cents(msg.get("yes_ask_dollars")),
        no_ask=100 - yes_bid if yes_bid is not None else None,
        ts_ms=int(msg.get("ts_ms") or time.time() * 1000),
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
@dataclass
class Watched:
    """A market we have seen: its quote path and any orders, until it settles."""

    ticker: str
    close_ms: float
    close_time: str
    title: str | None
    path: list[list[int | None]] = field(default_factory=list)
    orders: list[dict[str, Any]] = field(default_factory=list)
    last_quote: tuple[int | None, int | None] | None = None
    last_logged: float = 0.0


class Bot:
    HEARTBEAT_SECONDS = 60
    SETTLE_CHECK_SECONDS = 30
    MAX_PATH_POINTS = 400

    def __init__(self, cfg: Config, client: KalshiClient, sink: SupabaseSink | None = None):
        self.cfg = cfg
        self.client = client
        self.sink = sink or SupabaseSink(None, None)
        self.quotes: "queue.Queue[Quote]" = queue.Queue()
        self.feed = KalshiTicker(client, self.quotes)
        self.watched: dict[str, Watched] = {}
        self.current: Watched | None = None
        self.traded: set[str] = set()
        self.orders_today = 0
        self.today = date.today()
        self._last_settle_check = 0.0

    # -- one REST poll ---------------------------------------------------------
    def tick(self) -> None:
        if date.today() != self.today:
            self.today, self.orders_today = date.today(), 0

        market = pick_market(self.client.open_markets(self.cfg.series_ticker), time.time() * 1000)
        if market is None:
            log.info("no open %s market", self.cfg.series_ticker)
            self.current = None
        else:
            w = self.watched.get(market["ticker"])
            if w is None:
                w = Watched(market["ticker"], parse_iso_ms(market["close_time"]), market["close_time"], market.get("title"))
                self.watched[w.ticker] = w
            self.current = w
            self.feed.watch(w.ticker)
            self._observe(w, dollars_to_cents(market.get("yes_ask_dollars")), dollars_to_cents(market.get("no_ask_dollars")), "rest")
        self.settle_pass()

    # -- one streamed quote -----------------------------------------------------
    def on_quote(self, q: Quote) -> None:
        w = self.watched.get(q.ticker)
        if w is not None and w is self.current:
            self._observe(w, q.yes_ask, q.no_ask, "ws")

    def _observe(self, w: Watched, yes_ask: int | None, no_ask: int | None, source: str) -> None:
        now = time.time()
        close_in = int((w.close_ms - now * 1000) / 1000)
        if close_in <= 0:
            return
        quote = (yes_ask, no_ask)
        changed = quote != w.last_quote
        if changed or source == "rest":
            log.info("%-4s %s closes in %ds | YES ask %s¢ | NO ask %s¢", source, w.ticker, close_in, yes_ask, no_ask)
        if changed and len(w.path) < self.MAX_PATH_POINTS:
            w.path.append([close_in, yes_ask, no_ask])
        if changed or now - w.last_logged >= self.HEARTBEAT_SECONDS:
            w.last_quote, w.last_logged = quote, now
            self.sink.write("tick", live=self.cfg.live, ticker=w.ticker, title=w.title, close_time=w.close_time, seconds_to_close=close_in, yes_ask_cents=yes_ask, no_ask_cents=no_ask)
        if changed or source == "rest":
            self.sink.broadcast("tick", {"ticker": w.ticker, "title": w.title, "close_time": w.close_time, "seconds_to_close": close_in, "yes_ask_cents": yes_ask, "no_ask_cents": no_ask, "ts_ms": int(now * 1000), "live": self.cfg.live, "streaming": self.feed.connected})

        if w.ticker in self.traded:
            return
        if self.orders_today >= self.cfg.max_orders_per_day:
            return
        entry = find_entry(yes_ask, no_ask, self.cfg)
        if entry is None:
            return
        outcome, price = entry
        count = contracts_for(self.cfg.bet_usd, price)
        if count >= 1:
            self._enter(w, outcome, price, count, yes_ask, no_ask, close_in)

    def _enter(self, w: Watched, outcome: str, price: int, count: int, yes_ask: int | None, no_ask: int | None, close_in: int) -> None:
        mode = "LIVE" if self.cfg.live else "DRY-RUN"
        log.info("[%s] buy %dx %s @ %d¢ on %s", mode, count, outcome.upper(), price, w.ticker)
        self.traded.add(w.ticker)
        self.orders_today += 1

        client_order_id = str(uuid.uuid4())
        started = time.perf_counter()
        result: dict[str, Any] = {}
        if self.cfg.live:
            result = self.client.buy(w.ticker, outcome, price, count, client_order_id)
        latency_ms = int((time.perf_counter() - started) * 1000)

        fill_count = _int_or_none(result.get("fill_count"))
        avg_fill = dollars_to_cents(result.get("average_fill_price"))
        avg_fee = result.get("average_fee_paid")
        fee_cents = int(round(float(avg_fee) * 100 * fill_count)) if avg_fee and fill_count else None
        if self.cfg.live:
            log.info("order %s filled %s/%d avg %s¢ fee %s¢ in %dms", result.get("order_id"), fill_count, count, avg_fill, fee_cents, latency_ms)

        order = {
            "client_order_id": client_order_id,
            "outcome": outcome,
            "price_cents": price,
            "count": count,
            "fill_count": fill_count,
            "avg_fill_cents": avg_fill,
            "fee_cents": fee_cents,
        }
        w.orders.append(order)
        row = dict(
            live=self.cfg.live,
            ticker=w.ticker,
            title=w.title,
            close_time=w.close_time,
            seconds_to_close=close_in,
            yes_ask_cents=yes_ask,
            no_ask_cents=no_ask,
            latency_ms=latency_ms if self.cfg.live else None,
            order_id=result.get("order_id"),
            remaining_count=_int_or_none(result.get("remaining_count")),
            **order,
        )
        self.sink.write("order", **row)
        self.sink.broadcast("order", {k: v for k, v in row.items() if v is not None})

    # -- settlement ----------------------------------------------------------------
    def settle_pass(self) -> None:
        """Record results for closed markets and realized P&L for their orders."""
        now = time.time()
        if now - self._last_settle_check < self.SETTLE_CHECK_SECONDS:
            return
        self._last_settle_check = now
        for w in list(self.watched.values()):
            if now * 1000 < w.close_ms + self.cfg.settle_grace_seconds * 1000:
                continue
            try:
                market = self.client.market(w.ticker)
            except (KalshiError, requests.RequestException) as e:
                log.warning("settle lookup %s: %s", w.ticker, e)
                continue
            result = market.get("result")
            if result not in ("yes", "no"):
                if now * 1000 > w.close_ms + self.cfg.settle_timeout_seconds * 1000:
                    log.error("%s never settled; dropping", w.ticker)
                    self.sink.write("error", live=self.cfg.live, ticker=w.ticker, message=f"{w.ticker} never reported a result")
                    del self.watched[w.ticker]
                continue
            self._settle(w, result)
            del self.watched[w.ticker]

    def _settle(self, w: Watched, result: str) -> None:
        settled_at = now_iso()
        self.sink.write("settle", live=self.cfg.live, ticker=w.ticker, title=w.title, close_time=w.close_time, result=result, settled_at=settled_at, path=w.path)
        for o in w.orders:
            contracts = o["fill_count"] if (self.cfg.live and o["fill_count"] is not None) else o["count"]
            price = o["avg_fill_cents"] or o["price_cents"]
            fee = o["fee_cents"] if o["fee_cents"] is not None else kalshi_fee_cents(contracts, price)
            pnl = pnl_cents(o["outcome"], result, contracts, price, fee)
            log.info("%s settled %s: %s %dx @ %d¢ -> %+.2f", w.ticker, result.upper(), o["outcome"].upper(), contracts, price, pnl / 100)
            self.sink.update("client_order_id", o["client_order_id"], result=result, pnl_cents=pnl, fee_cents=fee, settled_at=settled_at)
        self.sink.broadcast("settle", {"ticker": w.ticker, "title": w.title, "result": result, "settled_at": settled_at, "orders": len(w.orders)})

    # -- loop ---------------------------------------------------------------------
    def run_forever(self) -> None:
        """REST poll every poll_seconds; streamed quotes handled the moment they land."""
        self.feed.start()
        next_poll = 0.0
        delay = float(self.cfg.poll_seconds)
        while True:
            try:
                if time.time() >= next_poll:
                    next_poll = time.time() + delay
                    self.tick()
                    delay = float(self.cfg.poll_seconds)
                try:
                    q = self.quotes.get(timeout=max(0.05, next_poll - time.time()))
                except queue.Empty:
                    continue
                while True:  # a burst of updates: act on each, newest last
                    self.on_quote(q)
                    try:
                        q = self.quotes.get_nowait()
                    except queue.Empty:
                        break
            except KalshiError as e:
                log.error("kalshi: %s", e)
                self.sink.write("error", live=self.cfg.live, message=str(e))
                delay = min(delay * 2, 300.0) if e.status == 429 else float(self.cfg.poll_seconds)
                next_poll = time.time() + delay
            except requests.RequestException as e:
                log.error("network: %s", e)
                self.sink.write("error", live=self.cfg.live, message=f"network: {e}")
                next_poll = time.time() + self.cfg.poll_seconds


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--live", action="store_true", help="place real orders (default: dry run)")
    parser.add_argument("--once", action="store_true", help="run a single poll and exit")
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
