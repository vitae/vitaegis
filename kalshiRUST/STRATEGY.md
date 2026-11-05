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
3. **Enters late.** NORMAL: a check every minute from 5 minutes out, one trade a window. RISK: the last 90 s, plus the early engine from 7 minutes out.
4. **Caps size.** NORMAL $5 per trade, up to 2 per window, and live trading stops for the UTC day after a $30 loss. RISK up to $100, 2 per window.
5. **Paper first.** `LIVE_TRADING=false` logs every signal to `trades.jsonl` and
   Supabase, settles against Kalshi's result, and reports P&L after fees. The run stops
   after 96 settled 15-minute trades (`PAPER_TRADE_LIMIT`) so the edge can be read before any money moves.
6. **Sniper (paper only).** Every 60 s it prices every open Kalshi Bitcoin price market except the
   15-minute one, found from Kalshi's series list. Markets that pay on touching a level use twice
   the chance of ending beyond it. It lists YES picks with a 75%+ win chance and 3¢ of edge at
   0.75x, 1x and 1.5x volatility, with a 45% a year volatility floor beyond a day, top 15 by
   expected profit. Picks closing within a day get a $5 paper trade, up to 5 open.

## Modes

The HUD's red RISK button writes `kalshirust_config.mode`; the bot polls it every 10 s.

| | NORMAL | RISK |
|---|---|---|
| Trades a window | up to 2 | 2 |
| Entry | checks at 5, 4, 3 and 1 minutes left, one trade a window, with the hour's BTC trend | last 90 s, plus the early engine from 7 min out |
| Last-90 trade | none, settlement math only logs | 60%+ win chance, 5c of edge |
| Second last-90 trade | none | 70%+, same side, 10 s later |
| Stake | live: 15% of the Kalshi balance, $5 max (`STAKE_FRACTION`, `MAX_ORDER_DOLLARS`); paper: $5 flat | 0.75 Kelly on the bankroll, $5 to $100 |
| Other floors | the rules below | $0.50 expected profit, 97c top price |

NORMAL makes one trade a window. It checks with 5, 4, 3 and 1 minutes left and buys the side whose mid
rose over the prior 60 s if the rise is 25c or more, the price is 30c to 49c or 66c to 82c, and the side
agrees with BTC's move over the prior hour (this window's strike against the strike of the window that
closed an hour earlier; YES needs BTC up, NO needs BTC down); after a trade the later checks are skipped.
Live, the stake is 15% of the Kalshi balance up to $5, read again at every window, so $30 funds $4.50
trades and a losing run shrinks the stake. (From Nov 4 19:00 to Nov 5 it also checked at 2 minutes, took
50-65c and had no trend condition; before that it checked at 2 and 1 minutes for rises of 10c into 70-82c or
18c into 50-70c. See the Nov 4 and Nov 5 reads.)

With `LIVE_TRADING=true` and under $5 in the account the bot waits for the deposit, checking every 60 s and
posting the wait to the HUD, rather than trading paper under a live flag. The strikes of the last two hours
of windows are fetched at startup so the trend is known from the first check.

A check skips a side whose mid fell 1c or more over the last 30 s. Settlement math still runs and logs in
NORMAL, but places no trades.

**Total loss stop.** `TOTAL_LOSS_LIMIT_DOLLARS` (default 30) is the live run's realized loss, over all
days, at which the bot turns itself to paper: it posts "Live trading stopped: the live run lost $X, past
the $30 limit" to the HUD, records only paper trades from then on, and stays paper across restarts
because the check reads `trades.jsonl` at startup. Archiving `trades.jsonl` and restarting starts a fresh
live run. The daily stop (`DAILY_LOSS_LIMIT_DOLLARS`) still pauses live trading until 00:00 UTC. One trade
a window (`BETS_PER_WINDOW` defaults to 1), so the HUD shows one row per window with its P&L and return.

**Shadow rule (Nov 4-5, removed Nov 5).** For a day the bot also logged the wide Nov 4 rule as paper trades
under source `shadow`. It doubled every window's row on the HUD and the user wanted one trade a window, so
it was removed; older rows stay in `kalshirust_events_archive`.

**Going live with $30.** The stake is now 15% of the balance up to $5 ($4.50 at $30), re-read every window,
and the daily loss stop is set to $10 in `.env`. At 5.4 trades a day, 79% wins and $0.91 a trade the month
says about +$4.90 a day at a full $5 stake, less at $4.50 and less again for the 2c the live book costs
(about +$2.50 a day). A run of four losses, which 100 trades at 79% produce about one time in five, costs
about $14 and drops the stake to $2.40, which is the point of the fraction. Later on Nov 5 the user asked
for one trade a window, no duplicate rows, a fresh `kalshirust_events` table, and a hard stop: lose $30 of
real money and the bot records paper trades only. That is the total loss stop above; the table was reset
(every row moved to `kalshirust_events_archive`) and `trades.jsonl` archived on the VPS at the same time.

**Stake for $10 a day (Nov 4, before the trend condition).** The month's edge is about $4.90 a day at $5 before slippage and $2.24 at 2c
more. $10 a day needs $10 a trade before slippage or $20 at 2c, and the worst day scales with it: -$68
at $10 (4 days past the $30 daily stop), -$139 at $20 (10 days). The paper run at $5 says what the fills
actually cost; the stake is set after it, not before.

**Other coins.** Kalshi runs the same market, with the same CF Benchmarks settlement, on ETH, SOL, XRP,
DOGE and others. On 7-13 days of public data none of them carries either rule: ETH loses under both (a 4c
spread at the last minute against 1c on BTC), the wide rule loses on XRP (-$0.34 a trade) and SOL (-$0.18)
and is flat on DOGE, and the narrow rule is positive on SOL and XRP only in windows that mostly have no
quote in the last minute. BTC is the only market with the depth for this.
