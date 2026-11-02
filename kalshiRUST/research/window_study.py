#!/usr/bin/env python3
"""What did each (minutes left, price) combination actually pay on settled KXBTC15M windows?

Public Kalshi endpoints only: no keys, no orders, writes nothing but a local cache.

    python research/window_study.py download 3000
    python research/window_study.py report

Entries assume a taker fill at the minute candle's closing quote. Rules are chosen on the
older part of the sample and scored on the newer part, so a cell that only looks good by
luck shows up as such.
"""
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

BASE = "https://api.elections.kalshi.com/trade-api/v2"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache", "windows.jsonl")
STAKE = 5.0
TRAIN_SHARE = 2 / 3


def get(path, tries=6):
    delay = 0.5
    for attempt in range(tries):
        try:
            req = urllib.request.Request(BASE + path, headers={"User-Agent": "kalshirust-research/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == tries - 1:
                raise
            time.sleep(delay)
            delay *= 2


def ts(s):
    return int(datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp())


def price(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if 0 < x < 1 else None


def fetch_window(m):
    open_ts, close_ts = ts(m["open_time"]), ts(m["close_time"])
    q = urllib.parse.urlencode({"start_ts": open_ts - 60, "end_ts": close_ts + 60, "period_interval": 1})
    try:
        data = get(f"/series/KXBTC15M/markets/{m['ticker']}/candlesticks?{q}")
    except urllib.error.HTTPError as e:
        return {"ticker": m["ticker"], "close": close_ts, "result": m["result"], "book": {}, "error": e.code}
    book = {}
    for c in data.get("candlesticks", []):
        left = close_ts - c["end_period_ts"]
        if 0 < left <= 900:
            book[str(left)] = [price(c["yes_bid"].get("close_dollars")), price(c["yes_ask"].get("close_dollars"))]
    return {"ticker": m["ticker"], "close": close_ts, "result": m["result"], "strike": m.get("floor_strike"), "book": book}


def download(want):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    have = set()
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            have = {json.loads(line)["ticker"] for line in f if line.strip()}
    markets, cursor = [], ""
    while len(markets) < want:
        q = {"series_ticker": "KXBTC15M", "status": "settled", "limit": 200}
        if cursor:
            q["cursor"] = cursor
        data = get("/markets?" + urllib.parse.urlencode(q))
        batch = data.get("markets", [])
        if not batch:
            break
        markets += [m for m in batch if m.get("result") in ("yes", "no")]
        cursor = data.get("cursor") or ""
        if not cursor:
            break
    markets = markets[:want]
    todo = [m for m in markets if m["ticker"] not in have]
    print(f"{len(markets)} settled windows listed, {len(todo)} to fetch", flush=True)
    done = empty = 0
    with open(CACHE, "a", encoding="utf-8") as out, ThreadPoolExecutor(5) as pool:
        for w in pool.map(fetch_window, todo):
            if w["book"]:
                out.write(json.dumps(w) + "\n")
            else:
                empty += 1
            done += 1
            if done % 250 == 0:
                out.flush()
                print(f"  {done}/{len(todo)} ({empty} without prices)", flush=True)
    print(f"done: {done} fetched, {empty} without prices", flush=True)


def load():
    with open(CACHE, encoding="utf-8") as f:
        rows = [json.loads(line) for line in f if line.strip()]
    seen, out = set(), []
    for w in sorted(rows, key=lambda r: r["close"]):
        if w["ticker"] not in seen:
            seen.add(w["ticker"])
            out.append(w)
    return out


def pnl(p, won):
    n = math.floor(STAKE / p)
    if n < 1:
        return None
    fee = 0.07 * p * (1 - p) * n
    return (1 - p) * n - fee if won else -p * n - fee


class Tally:
    def __init__(self):
        self.pnls, self.wins, self.prices = [], 0, []

    def add(self, p, won):
        x = pnl(p, won)
        if x is None:
            return
        self.pnls.append(x)
        self.prices.append(p)
        self.wins += 1 if won else 0

    @property
    def n(self):
        return len(self.pnls)

    @property
    def net(self):
        return sum(self.pnls)

    @property
    def roi(self):
        return self.net / (self.n * STAKE) * 100 if self.n else 0.0

    @property
    def t(self):
        if self.n < 2:
            return 0.0
        m = self.net / self.n
        v = sum((x - m) ** 2 for x in self.pnls) / (self.n - 1)
        return m / math.sqrt(v / self.n) if v > 0 else 0.0

    @property
    def net_without_best(self):
        return self.net - max(self.pnls) if self.pnls else 0.0

    def row(self):
        if not self.n:
            return "      0"
        avg = sum(self.prices) / self.n * 100
        return (
            f"{self.n:>7} {self.wins / self.n * 100:>6.1f}% {avg:>6.1f}c {self.net:>+10.2f} "
            f"{self.roi:>+7.1f}% t={self.t:>+5.2f}  ex-best {self.net_without_best:>+9.2f}"
        )


def entries(w, left):
    q = w["book"].get(str(left))
    if not q:
        return
    bid, ask = q
    if ask is not None and 0.01 <= ask <= 0.99:
        yield "yes", ask
    if bid is not None and 0.01 <= 1 - bid <= 0.99:
        yield "no", 1 - bid


BUCKETS = [
    (0.01, 0.05), (0.05, 0.10), (0.10, 0.15), (0.15, 0.20), (0.20, 0.30), (0.30, 0.40), (0.40, 0.50),
    (0.50, 0.60), (0.60, 0.70), (0.70, 0.80), (0.80, 0.85), (0.85, 0.90), (0.90, 0.95), (0.95, 0.99001),
]


def label(b):
    return f"{b[0] * 100:>2.0f}-{b[1] * 100:<3.0f}c"


def report():
    ws = load()
    cut = int(len(ws) * TRAIN_SHARE)
    train, test = ws[:cut], ws[cut:]

    def day(t):
        return datetime.fromtimestamp(t, timezone.utc).strftime("%b %d")

    print(
        f"{len(ws)} windows, {day(ws[0]['close'])} to {day(ws[-1]['close'])} | rules found on the older "
        f"{len(train)} ({day(train[0]['close'])}-{day(train[-1]['close'])}), scored on the newer {len(test)} "
        f"({day(test[0]['close'])}-{day(test[-1]['close'])})"
    )
    print("$5 stake, taker at the quote, fee 0.07*p*(1-p). Columns: n, win%, avg price, net $, ROI, t-stat, net without the single best trade\n")

    print("=== 1. EVERY ENTRY BY PRICE, ALL MINUTES ===")
    for name, part in (("older", train), ("newer", test)):
        print(f"--- {name}")
        for b in BUCKETS:
            t = Tally()
            for w in part:
                for left in range(60, 900, 60):
                    for side, p in entries(w, left):
                        if b[0] <= p < b[1]:
                            t.add(p, w["result"] == side)
            print(f"{label(b)} {t.row()}")

    print("\n=== 2. FIND CELLS ON OLDER DATA, SCORE THEM ON NEWER ===")
    cells = {}
    for w in train:
        for m in range(1, 15):
            for side, p in entries(w, m * 60):
                for b in BUCKETS:
                    if b[0] <= p < b[1]:
                        cells.setdefault((m, b), Tally()).add(p, w["result"] == side)
    tested = len(cells)
    picks = [(k, t) for k, t in cells.items() if t.n >= 40 and t.net > 0 and t.t >= 2.0 and t.net_without_best > 0]
    picks.sort(key=lambda kt: -kt[1].t)
    print(f"{tested} cells tested on older data, {len(picks)} look good (n>=40, t>=2, still positive without the best trade). By chance alone expect about {tested * 0.023:.0f}.")
    combined = Tally()
    for (m, b), t in picks:
        out = Tally()
        for w in test:
            for side, p in entries(w, m * 60):
                if b[0] <= p < b[1]:
                    out.add(p, w["result"] == side)
                    combined.add(p, w["result"] == side)
        print(f"{m:>2}m left {label(b)} OLD {t.row()}")
        print(f"                NEW {out.row()}")
    print(f"ALL PICKS ON NEWER DATA: {combined.row()}")

    print("\n=== 3. REVERSAL: BUY THE CHEAP SIDE WHEN THE BOOK IS EXTREME ===")
    for lo, hi, name in ((0.01, 0.10, "cheap side 1-10c"), (0.10, 0.20, "cheap side 10-20c"), (0.20, 0.30, "cheap side 20-30c")):
        for m in (5, 4, 3, 2, 1):
            a, c = Tally(), Tally()
            for part, t in ((train, a), (test, c)):
                for w in part:
                    for side, p in entries(w, m * 60):
                        if lo <= p < hi:
                            t.add(p, w["result"] == side)
            print(f"{name:<18} {m}m left OLD {a.row()}")
            print(f"{'':<18} {m}m left NEW {c.row()}")

    print("\n=== 4. REVERSAL: AFTER A SHARP MOVE, FADE IT OR FOLLOW IT ===")
    print("Move = YES mid changed by at least the threshold in the last minute. Fade buys the side that just fell, follow the side that just rose.")
    for thr in (0.15, 0.25):
        for lo_m, hi_m in ((1, 2), (3, 5), (6, 9), (10, 13)):
            fade = {"older": Tally(), "newer": Tally()}
            follow = {"older": Tally(), "newer": Tally()}
            for name, part in (("older", train), ("newer", test)):
                for w in part:
                    # Earliest qualifying minute first: live trading cannot know a later one is coming.
                    for m in range(hi_m, lo_m - 1, -1):
                        now, before = w["book"].get(str(m * 60)), w["book"].get(str((m + 1) * 60))
                        if not now or not before or None in now or None in before:
                            continue
                        move = sum(now) / 2 - sum(before) / 2
                        if abs(move) < thr:
                            continue
                        fell = "no" if move > 0 else "yes"
                        for side, p in entries(w, m * 60):
                            if side == fell:
                                fade[name].add(p, w["result"] == side)
                            else:
                                follow[name].add(p, w["result"] == side)
                        break
            print(f"move>={thr * 100:.0f}c, {lo_m}-{hi_m}m left")
            print(f"   fade   OLD {fade['older'].row()}")
            print(f"   fade   NEW {fade['newer'].row()}")
            print(f"   follow OLD {follow['older'].row()}")
            print(f"   follow NEW {follow['newer'].row()}")


def momentum_trades(ws, thr, lo_m, hi_m, slip=0.0, lo_p=0.01, hi_p=0.99):
    """One entry per window: the first whole minute where YES mid moved at least thr, buying the side that rose."""
    out = []
    for w in ws:
        for m in range(hi_m, lo_m - 1, -1):
            now, before = w["book"].get(str(m * 60)), w["book"].get(str((m + 1) * 60))
            if not now or not before or None in now or None in before:
                continue
            move = sum(now) / 2 - sum(before) / 2
            if abs(move) < thr:
                continue
            side = "yes" if move > 0 else "no"
            p = now[1] if side == "yes" else 1 - now[0]
            p += slip
            if lo_p <= p <= hi_p:
                out.append((w, m, side, p))
            break
    return out


def tally(trades):
    t = Tally()
    for w, m, side, p in trades:
        t.add(p, w["result"] == side)
    return t


def by_day(trades):
    days = {}
    for w, m, side, p in trades:
        d = datetime.fromtimestamp(w["close"], timezone.utc).strftime("%Y-%m-%d")
        x = pnl(p, w["result"] == side)
        if x is not None:
            days[d] = days.get(d, 0.0) + x
    return days


def day_bootstrap(days, n=4000, seed=7):
    import random
    rng = random.Random(seed)
    vals = list(days.values())
    means = sorted(sum(rng.choice(vals) for _ in vals) / len(vals) for _ in range(n))
    return means[int(n * 0.025)], means[int(n * 0.975)]


def candidate():
    ws = load()
    cut = int(len(ws) * TRAIN_SHARE)
    train, test = ws[:cut], ws[cut:]
    print(f"{len(ws)} windows | older {len(train)} | newer {len(test)}")
    print("Rule: first whole minute with a sharp 60 s move in the YES mid, buy the side that rose, one trade a window, $5.\n")
    print("=== A. MOVE SIZE AND TIME LEFT ===")
    for thr in (0.15, 0.20, 0.25, 0.30):
        for lo_m, hi_m in ((1, 2), (3, 5), (1, 5), (6, 9)):
            print(f"move>={thr * 100:.0f}c {lo_m}-{hi_m}m OLD {tally(momentum_trades(train, thr, lo_m, hi_m)).row()}")
            print(f"{'':>13} NEW {tally(momentum_trades(test, thr, lo_m, hi_m)).row()}")
    print("\n=== B. PRICE PAID (move>=25c, 1-5m) ===")
    for lo_p, hi_p in ((0.01, 0.60), (0.60, 0.70), (0.70, 0.80), (0.80, 0.85), (0.85, 0.90), (0.90, 0.95), (0.95, 0.99)):
        print(f"{lo_p * 100:>2.0f}-{hi_p * 100:<3.0f}c OLD {tally(momentum_trades(train, 0.25, 1, 5, 0, lo_p, hi_p)).row()}")
        print(f"{'':>7} NEW {tally(momentum_trades(test, 0.25, 1, 5, 0, lo_p, hi_p)).row()}")
    print("\n=== C. WORSE FILLS (move>=25c, 1-5m, all data) ===")
    for slip in (0.0, 0.01, 0.02, 0.03, 0.05):
        print(f"paying {slip * 100:.0f}c more: {tally(momentum_trades(ws, 0.25, 1, 5, slip)).row()}")
    print("\n=== D. DAY BY DAY (move>=25c, 1-5m) ===")
    for name, thr, lo_m, hi_m, hi_p in (("all prices", 0.25, 1, 5, 0.99), ("price <= 90c", 0.25, 1, 5, 0.90)):
        trades = momentum_trades(ws, thr, lo_m, hi_m, 0, 0.01, hi_p)
        days = by_day(trades)
        lo, hi = day_bootstrap(days)
        up = sum(1 for v in days.values() if v > 0)
        print(f"{name}: {len(trades)} trades over {len(days)} days | {up} up days, {len(days) - up} down | avg ${sum(days.values()) / len(days):+.2f} a day | 95% range for the daily average ${lo:+.2f} to ${hi:+.2f}")
    print("\n=== E. ROUGHLY WHAT THE LIVE RULE WOULD BE ===")
    for name, part in (("OLD", train), ("NEW", test)):
        early = momentum_trades(part, 0.25, 3, 5, 0, 0.01, 0.90)
        late = momentum_trades(part, 0.25, 1, 2, 0, 0.01, 0.90)
        print(f"{name} 3-5m left, <=90c {tally(early).row()}")
        print(f"{name} 1-2m left, <=90c {tally(late).row()}")


NORMAL_BANDS = ((0.05, 0.60), (0.72, 0.82))
AFTER_NINE_BANDS = ((0.72, 0.82),)


def anytime_trades(ws, thr=0.25, first_m=9, last_m=2, lo_p=0.05, hi_p=0.85, slip=0.0, bands=None, keep_looking=False):
    """The bot's any-time slot: the first sharp minute decides the window, in or out."""
    out = []
    for w in ws:
        for m in range(first_m, last_m - 1, -1):
            now, before = w["book"].get(str(m * 60)), w["book"].get(str((m + 1) * 60))
            if not now or not before or None in now or None in before:
                continue
            move = sum(now) / 2 - sum(before) / 2
            if abs(move) < thr:
                continue
            side = "yes" if move > 0 else "no"
            p = (now[1] if side == "yes" else 1 - now[0]) + slip
            if any(x - 1e-9 <= p <= y + 1e-9 for x, y in bands) if bands else lo_p <= p <= hi_p:
                out.append((w, m, side, p))
                break
            if not keep_looking:
                break
    return out


def anytime():
    ws = load()
    cut = int(len(ws) * TRAIN_SHARE)
    train, test = ws[:cut], ws[cut:]
    print(f"{len(ws)} windows | older {len(train)} | newer {len(test)}")
    print("Any-time slot: first whole minute 2-9m before close with a 60 s YES mid move >= threshold, buy the side that rose at <= the top price, $5.")
    for thr, hi_p in ((0.25, 0.85), (0.25, 0.82), (0.25, 0.80), (0.20, 0.85), (0.30, 0.85), (0.25, 0.97)):
        print(f"--- move>={thr * 100:.0f}c, price<={hi_p * 100:.0f}c")
        print(f"OLD {tally(anytime_trades(train, thr, 9, 2, 0.05, hi_p)).row()}")
        print(f"NEW {tally(anytime_trades(test, thr, 9, 2, 0.05, hi_p)).row()}")
    print("--- the bot's after-9-minutes slot: 15c move, 5 to 2 minutes left, 72-82c")
    rule = dict(thr=0.15, first_m=5, last_m=2, bands=AFTER_NINE_BANDS, keep_looking=True)
    print(f"OLD {tally(anytime_trades(train, **rule)).row()}")
    print(f"NEW {tally(anytime_trades(test, **rule)).row()}")
    print("--- chosen rule by time left, all data")
    for a, b in ((9, 6), (5, 3), (2, 2)):
        print(f"{a}-{b}m left {tally(anytime_trades(ws, 0.25, a, b)).row()}")
    print("--- chosen rule with worse fills, all data")
    for slip in (0.0, 0.01, 0.02, 0.03):
        print(f"paying {slip * 100:.0f}c more: {tally(anytime_trades(ws, slip=slip)).row()}")
    trades = anytime_trades(ws)
    days = by_day(trades)
    lo, hi = day_bootstrap(days)
    up = sum(1 for v in days.values() if v > 0)
    t = tally(trades)
    edge = sum(1 for w, m, side, p in trades if w["result"] == side) / len(trades) - sum(p for _, _, _, p in trades) / len(trades)
    print(f"--- {len(trades)} trades over {len(days)} days, {len(trades) / len(ws) * 100:.1f}% of windows | {up} up days, {len(days) - up} down | avg ${sum(days.values()) / len(days):+.2f} a day | 95% range ${lo:+.2f} to ${hi:+.2f}")
    print(f"--- win rate minus price paid: {edge * 100:+.2f}c | net ${t.net:+.2f}, ${t.net / t.n:+.3f} a trade")


if __name__ == "__main__":
    if sys.argv[1:2] == ["download"]:
        download(int(sys.argv[2]) if len(sys.argv) > 2 else 3000)
    elif sys.argv[1:2] == ["candidate"]:
        candidate()
    elif sys.argv[1:2] == ["anytime"]:
        anytime()
    else:
        report()
