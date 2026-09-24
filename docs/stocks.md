# Stocks

`/stocks` ranks twelve tickers by their move since the last close of 2025.

## Files

- `app/stocks/data.ts` — the tickers, their fixed Dec 31, 2025 closes (`start`) and a
  saved snapshot of later closes (`end`, dated by `asOfSnapshot`). `start` never changes.
- `lib/stocks.ts` — `getStockPrices()`, the one fetch implementation. Server-only.
- `app/api/stocks/route.ts` — `GET /api/stocks`, the same data as JSON.
- `app/stocks/page.tsx` — server component; `app/stocks/StocksBoard.tsx` is the only
  client component (sort toggle).

## Data source

Yahoo Finance's public chart endpoint, one request per ticker in parallel:

```
https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?range=5d&interval=1d
```

Bitcoin is `BTC-USD` (see `yahooSymbol`). Requests send a browser `User-Agent`; Yahoo
answers 429 without one. The last non-null daily close is taken and rounded to cents.
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
  `data.ts`; the rest stay live and `source` is `'live'`.
- If every ticker fails, or the whole call throws, the response is the snapshot:
  `{ asOf: asOfSnapshot, prices, source: 'snapshot' }`. The page then shows "Snapshot"
  instead of a date.

This means `npm run build` succeeds with or without network access.

## JSON shape

```json
{
  "asOf": "2026-09-23T13:30:00.000Z",
  "prices": { "SPY": 767.81, "BTC": 83268.44 },
  "source": "live"
}
```

`asOf` is the newest bar across all tickers, or `asOfSnapshot` when `source` is
`'snapshot'`.

## Refreshing the snapshot

Run the endpoint above for each ticker, copy the last close into `end` in
`app/stocks/data.ts`, and set `asOfSnapshot` to that trading day.
