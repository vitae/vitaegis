# KALSHIRUST strategy notes

## What the evidence says (Nov 2026 literature review)

- **Settlement.** KXBTC15M resolves YES when the 60-second average of CF Benchmarks' BRTI
  before close is at least the 60-second average before open. Ties resolve YES. Coinbase
  spot is a proxy for BRTI, not the index itself.
- **Fees.** Taker fee per contract = 0.07 × P × (1 − P), max 1.75¢ at 50¢. No maker fee on
  this series. The fee is the dominant cost; in three independent backtests it flipped most
  small-edge strategies from positive to negative.
- **Calibration.** Two ~6,000-window studies (one vendor, one independent with bootstrap
  tests) found buying the favorite at the ask earns about +0.7¢ gross and is negative after
  fees at every entry time. The market is slightly over-confident 2–3 minutes before close
  (calibration slope ≈ 0.91), which is the only documented pocket of mispricing, and it is
  small.
- **Model.** Driftless GBM, P(up) = Φ(ln(S/K)/σ√τ), with realized vol from the spot feed,
  clamped to [0.10, 0.90]. Clamping improved the Brier score in 9 of 9 walk-forward folds in
  one study.
- **No verifiable profitable bot exists in public.** Every profit claim reviewed was either
  in-sample, unaudited, or retracted.

## What this bot does about it

1. **Measures the edge instead of assuming it.** Every entry is gated on fee-adjusted
   expected value: `EV = p_win·(1 − price) − (1 − p_win)·price − 0.07·price·(1 − price)`.
   NORMAL mode needs ≥ 2¢ per contract; RISK mode needs ≥ 1¢.
2. **Prices both sides.** YES at the ask or NO at (1 − YES bid), whichever has the edge.
3. **Enters late, not early.** NORMAL: 90 s to 5 min before close. RISK: 30 s to 7 min.
   Early in the window the model has no information the market lacks.
4. **Caps size.** NORMAL $5 per trade, 1 trade per window. RISK $20, 2 per window.
5. **Paper first.** `LIVE_TRADING=false` logs every signal to `trades.jsonl` and
   Supabase, settles against Kalshi's result, and reports P&L after fees. The run stops
   after 8 settled 15-minute trades so the edge can be read before any money moves.
6. **Sniper (paper only).** Every 60 s it prices every open BTC market (15-minute, hourly
   range, hourly and daily above/below) with the same model scaled to the horizon, publishes
   the top 15 by edge to the HUD, and paper-trades any with ≥ 3¢ edge, $5 each, up to 5 open.

## Modes

| | NORMAL | RISK |
|---|---|---|
| Max per trade | $5 | $20 |
| Min fee-adjusted edge | 2¢ | 1¢ |
| Trades per window | 1 | 2 |
| Entry window before close | 90 s – 5 min | 30 s – 7 min |

The HUD's red RISK button writes `kalshirust_config.mode`; the bot polls it every 10 s.

## Honest expectations

On a 45¢ contract with $5, the most you can win is about $6, not $10. A "slight edge" at
these prices is cents per contract; with $5 trades that is cents per trade. Volume only
turns cents into dollars if the edge is real, which is exactly what the paper run measures.
