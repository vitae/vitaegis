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

## Backtest, Nov 2 2026 (last 400 settled windows, Kalshi minute prices, Coinbase spot)

`cargo run --release --bin backtest` replays the engine's rules over history and pushes
the trades to the HUD. First run, pure model (MODEL_WEIGHT=1), 2c min edge, 90–300 s entry,
up to 2 trades per window:

| | |
|---|---|
| Trades | 338 |
| Hit rate | 36.7% |
| Net after fees | −$267.73 on $1,692.73 risked (−15.8%) |
| Avg predicted edge | +10.6¢ per contract |
| 15–30¢ entries | 124 trades, 19% hit, −$143 |
| 70–85¢ entries | 33 trades, 85% hit, +$13 |

Calibration over 844 in-window readings (Brier score, lower is better, 0.25 = coin flip):
market mid 0.160, pure model 0.186, model×0.5 0.168, model×0.25 0.163. Where the model
disagreed with the market by more than 15 points the market was right almost every time
(model higher: realized 12.8% vs model 40.7%; model lower: realized 75.7% vs market 75.8%).

**Conclusion:** the market's own price is a better forecast than the model. The model's
"edge" was its error. Walk-forward (weight chosen on the older half by Brier, scored on the
newer half) picked MODEL_WEIGHT=0.15: 20 trades, 30% hit, +$9.92. That is a sample of 20,
not evidence of an edge. The bot now runs at 0.15 so it only acts when model and market
disagree sharply, and the live paper run is the out-of-sample test.

## Settlement engine (the part that works)

KXBTC15M settles on the average of the 60 one-second BRTI prints before close, and Kalshi
republishes those prints every second at a public URL. Inside the final minute part of the
settlement value is therefore known. The engine (`src/settle.rs`) anchors the unknown
remainder on Coinbase's real-time mid plus the measured BRTI basis, computes the
settlement mean and spread exactly, and trades the fee-adjusted edge on either side.

First live window (Nov 2, 01:45–02:00 UTC): two paper trades, both won, +$2.65 on $9.35.
Self-check: the 60-second estimate (no prints known yet) called the wrong side; every
estimate from 45 seconds down was right. That split is the rule:

| | NORMAL | RISK |
|---|---|---|
| First trade | P(win) ≥ 90% on ≥ 5 known prints (from ~52 s out) | P(win) ≥ 80%, projection allowed (from 90 s out) |
| Second trade | P(win) ≥ 95% on ≥ 15 known prints, ≥ 10 s after the first | same |
| Stake | flat $5 | enough for a $3 win, capped by half-Kelly on the bankroll and $100 |
| Price paid | 5–97¢, fee-adjusted edge ≥ 2¢ | same |

NORMAL buys certainty: small, frequent wins on 90–96¢ favorites, cents each. RISK buys
the bigger edges that appear in the second before the book catches up to Coinbase, and
accepts that one in five of those loses. The dollars-per-window line in the log and the
HUD is the scorecard for both.

## Honest expectations

On a 45¢ contract with $5, the most you can win is about $6, not $10. A "slight edge" at
these prices is cents per contract; with $5 trades that is cents per trade. Volume only
turns cents into dollars if the edge is real, which is exactly what the paper run measures.
