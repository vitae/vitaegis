# Stocks

`/stocks` ranks twelve tickers by their move over a period the visitor picks: 1D, 1W, 1M,
3M, 6M, YTD (the default, since the Dec 31, 2025 close), 1Y or 5Y.

## Files

- `app/stocks/data.ts` — the tickers, their fixed Dec 31, 2025 closes (`start`, used for
  YTD), a saved snapshot of later closes (`end`, dated by `asOfSnapshot`) and the
  `periods` list. `start` never changes.
- `lib/stocks.ts` — `getStockPrices()`, the one fetch implementation. Server-only.
- `lib/stocks-periods.ts` — `referenceFor()`, which picks each period's start close from
  a ticker's daily closes. Tested in `lib/stocks-periods.test.ts`.
- `app/api/stocks/route.ts` — `GET /api/stocks`, the same data as JSON.
- `app/stocks/page.tsx` — server component; `app/stocks/StocksBoard.tsx` is the only
  client component (period and sort toggles). Switching periods is client-side; every
  period's start close is already in the page.

## Data source

Yahoo Finance's public chart endpoint, one request per ticker in parallel:

```
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?range=10y&interval=1d
```

Bitcoin is `BTC-USD` (see `yahooSymbol`). Requests send a browser `User-Agent`; Yahoo
answers 429 without one. Non-null daily closes are kept and rounded to cents; the last
one is the latest price. Yahoo's `close` is split-adjusted (not dividend-adjusted), so
long periods like 5Y compare like with like across splits (NVDA, GOOGL, AMZN, TSLA). Ten years, not five, because `range=5y` starts just after the
5Y mark and leaves no bar to compare against. About 275 KB per ticker, well under Next's
2 MB data-cache limit.

## Periods

Each period compares the latest close with the last close on or before (latest bar −
period), stepping back in UTC calendar days or months (month ends clamp, so Mar 31 − 1M is
Feb 28). 1D is the previous bar. YTD always uses the fixed `start` in `data.ts`. A ticker
whose history does not reach back far enough (for example COIN before its 2021 listing)
has no start for that period and shows a dash, sorted last. The column header date comes
from the first live stock; Bitcoin, which trades weekends, is used only if no stock is live.
No API key is needed and none is read.

## Caching

- Every fetch passes `next: { revalidate: 3600 }`, so Next's data cache holds each
  ticker for an hour and the page and the route share the same cached responses.
- `app/stocks/page.tsx` and `app/api/stocks/route.ts` both set `export const revalidate
  = 3600`, so the rendered page and the JSON are ISR-cached for an hour as well.
- The page calls `getStockPrices()` directly; it never fetches its own API route over
  HTTP, which would be fragile at build time.

## Fallback

`getStockPrices()` never throws.

- A ticker that fails (network, 429, empty range) gets its `end` from the snapshot in
  `data.ts` and only its YTD start; the rest stay live and `source` is `'live'`.
- If every ticker fails, or the whole call throws, the response is the snapshot:
  `{ asOf: asOfSnapshot, prices, starts, startDates, source: 'snapshot' }` with YTD
  starts only. The page then shows "Snapshot" instead of a date, and every period but
  YTD shows dashes.

This means `npm run build` succeeds with or without network access.

## JSON shape

```json
{
  "asOf": "2026-09-23T13:30:00.000Z",
  "prices": { "SPY": 767.81, "BTC": 83268.44 },
  "starts": { "SPY": { "1d": 765.1, "1w": 758.02, "ytd": 681.92, "5y": 443.2 } },
  "startDates": { "1d": "2026-09-22", "1w": "2026-09-16", "ytd": "2025-12-31" },
  "source": "live"
}
```

`asOf` is the newest bar across all tickers, or `asOfSnapshot` when `source` is
`'snapshot'`.

## Refreshing the snapshot

Run the endpoint above for each ticker, copy the last close into `end` in
`app/stocks/data.ts`, and set `asOfSnapshot` to that trading day.
