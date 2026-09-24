# Stocks

`/stocks` ranks 78 tickers by their move over a period the visitor picks: 1D, 1W, 1M, 3M,
6M, YTD (the default, since the Dec 31, 2025 close), 1Y or 5Y. A group filter narrows the
board to one of:

| Group                 | Tickers                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Market                | SPY, QQQ, BTC                                                                                             |
| Big Tech              | AAPL, MSFT, GOOGL, AMZN, META, TSLA, COIN, CSCO, ORCL, NFLX, PLTR                                         |
| Chips                 | NVDA, AMD, INTC, TSM, AVGO, QCOM, ARM, MRVL, TXN, ADI, NXPI, ON, MCHP, MPWR, GFS, ASML, AMAT, LRCX, KLAC, TER, SNPS, CDNS, SMH, SOXX |
| Memory & Hardware     | SNDK, MU, WDC, STX, DELL, HPE, SMCI                                                                       |
| Gold, Silver & Copper | GLD, SLV, CPER, NEM, AEM, B, KGC, WPM, FNV, PAAS, FCX, SCCO, TECK, TMQ, NAK, GDX, SIL, COPX               |
| Uranium               | CCJ, NXE, UEC, UUUU, DNN, LEU, URA, URNM                                                                  |
| Core Picks            | BRK.B, JPM, V, LLY, COST, CEG, VST                                                                        |

Notes: Barrick trades as `B` since 2025 (`GOLD` is now a different company). TMQ (Trilogy
Metals, Ambler district) and NAK (Northern Dynasty, Pebble) are the Alaska copper
developers. GLD, SLV and CPER track the metals themselves.

## Files

- `app/stocks/data.ts` — the tickers (with `group` and Nasdaq `asset` class), snapshot
  closes for Dec 31, 2025 (`start`) and a later day (`end`, dated by `asOfSnapshot`), and
  the `groups` and `periods` lists.
- `lib/stocks.ts` — `getStockPrices()`, the one fetch implementation. Server-only. Tested
  with a mocked `fetch` in `lib/stocks.test.ts`.
- `lib/stocks-periods.ts` — `referenceFor()` and `closeOnOrBefore()`, which pick each
  period's start close from a ticker's daily closes. Tested in `lib/stocks-periods.test.ts`.
- `app/api/stocks/route.ts` — `GET /api/stocks`, the same data as JSON.
- `app/stocks/page.tsx` — server component; `app/stocks/StocksBoard.tsx` is the only
  client component (group, period and sort toggles). Filtering and switching periods are
  client-side; every period's start close is already in the page.

To add a ticker, add a row to `stocks` in `data.ts` with its group, its Nasdaq asset class
(`stocks`, `etf` or `crypto`; the wrong one returns "Symbol not exists") and snapshot
closes.

## Data sources

One request per ticker, 16 at a time. No API key is needed and none is read.

1. **Nasdaq** (primary), the exchange's own quote API:

   ```
   https://api.nasdaq.com/api/quote/<TICKER>/historical?assetclass=<stocks|etf|crypto>&fromdate=<5y+14d ago>&todate=<Dec 31 this year>&limit=9999
   ```

   Rows are newest first, with closes as strings like `"$1,816.57"`. Dates are read as
   noon UTC so they show the same day in US time zones. About 140 KB per ticker. Requests
   send browser headers (`User-Agent`, `Origin`, `Referer`) and time out after 8 s. After 3 Nasdaq failures in one refresh the remaining tickers skip
   straight to Yahoo, so an outage costs one timeout, not one per ticker.

2. **Yahoo Finance** (backup, per ticker, only when Nasdaq fails or returns nothing):

   ```
   https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?range=10y&interval=1d
   ```

   Bitcoin is `BTC-USD` and Berkshire `BRK-B` there (see `yahooSymbol`). Ten years because `range=5y` starts just
   after the 5Y mark and leaves no bar to compare against.

Both sources' closes are split-adjusted, not dividend-adjusted, so long periods compare
like with like across splits. Closes are kept to four decimals (split-adjusted history can
be under a dollar) and shown to two.

## Periods

Each period compares the latest close with the last close on or before (latest bar −
period), stepping back in UTC calendar days or months (month ends clamp, so Mar 31 − 1M is
Feb 28). 1D is the previous bar. YTD is the last close on or before Dec 31, 2025, falling
back to `start` in `data.ts`. A ticker whose history does not reach back far enough (ARM and
SNDK for 5Y) has no start for that period and shows a dash, sorted last. The column header
date comes from the first live stock; Bitcoin, which trades weekends, is used only if no
stock is live.

## Caching

- Every fetch passes `next: { revalidate: 3600 }`, so Next's data cache holds each ticker
  for an hour and the page and the route share the same cached responses. Nasdaq's
  `fromdate` moves daily, so its cache keys roll over once a day as well.
- `app/stocks/page.tsx` and `app/api/stocks/route.ts` both set `revalidate = 3600`, so the
  rendered page and the JSON are ISR-cached for an hour, and `maxDuration = 60`: a cold
  fetch of every ticker takes several seconds.
- The page calls `getStockPrices()` directly; it never fetches its own API route over HTTP,
  which would be fragile at build time.

## Fallback

`getStockPrices()` never throws.

- A ticker both sources fail gets its `end` from the snapshot in `data.ts` and only its YTD
  start; the rest stay live and `source` is `'live'`.
- If every ticker fails, or the whole call throws, the response is the snapshot:
  `{ asOf: asOfSnapshot, prices, starts, startDates, source: 'snapshot' }` with YTD starts
  only. The page then shows "Snapshot" instead of a date, and every period but YTD shows
  dashes.

This means `npm run build` succeeds with or without network access.

## JSON shape

```json
{
  "asOf": "2026-09-23T12:00:00.000Z",
  "prices": { "SPY": 767.81, "SNDK": 1816.57 },
  "starts": { "SPY": { "1d": 773.38, "1w": 754.05, "ytd": 681.92, "5y": 443.18 } },
  "startDates": { "1d": "2026-09-22", "1w": "2026-09-16", "ytd": "2025-12-31" },
  "source": "live"
}
```

`asOf` is the newest stock bar (Bitcoin posts today's bar before stocks close, so it only
counts when no stock is live), or `asOfSnapshot` when `source` is `'snapshot'`.

## Refreshing the snapshot

Fetch the Nasdaq URL above for each ticker, copy the last close into `end` in
`app/stocks/data.ts`, and set `asOfSnapshot` to that trading day.
