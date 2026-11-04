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
| Entry | checks at 5, 4, 3, 2 and 1 minutes left, one trade a window | last 90 s, plus the early engine from 7 min out |
| Last-90 trade | none, settlement math only logs | 60%+ win chance, 5c of edge |
| Second last-90 trade | none | 70%+, same side, 10 s later |
| Stake | $5 flat (`SURE_BET_MULT` above 1 raises it at 95%+ with 15 prints) | 0.75 Kelly on the bankroll, $5 to $100 |
| Other floors | the rules below | $0.50 expected profit, 97c top price |

NORMAL makes one $5 trade a window. It checks with 5, 4, 3, 2 and 1 minutes left and buys the side whose mid
rose over the prior 60 s if the rise is 25c or more and the price is 30c to 82c; after a trade the later
checks are skipped. (Until Nov 4 it checked at 2 and 1 minutes for rises of 10c into 70-82c or 18c into
50-70c; see the Nov 4 reads for the choice.)

A check skips a side whose mid fell 1c or more over the last 30 s. Settlement math still runs and logs in
NORMAL, but places no trades.

**Shadow rule.** Alongside, the bot logs the narrow rule (a 20c+ rise into 50-82c, checked once with 1 minute
left) as paper trades under source `shadow`: never sent live, never counted against `PAPER_TRADE_LIMIT`,
settled like every other paper trade. The trade summary and `kalshirust_events` (kinds `signal` and
`settle`, source `shadow`) score it beside the live rule on the same windows.

On the month of data: 326 trades, 9.9 a day, in 10.8% of windows, 6 of them second trades, 77.0% wins, +$0.40 a
trade, about +$3.96 a day, worst drop $36.24, worst UTC day -$33.94. It is positive in all three parts of the
month (+$0.06, +$0.90, +$0.23 a trade), has t=2.46, and stays positive at 2c of worse fills (+$0.26). The 10c
rule alone is 191 trades, 82.7% wins, +$0.30 a trade, about +$1.73 a day, and loses in the newest part
(-$0.20 a trade). The trades the 18c rule adds win 69%, below a 75% target, and lose in the oldest part.

Wider rules trade more and earn less. The most active that stayed positive in every part, a 15c rise at 45c to
96c, trades in 22.5% of windows at +$0.13 a trade, with about nothing left at 2c of worse fills and a worst drop
of $48.53. Rules picked for most trades on the older two thirds of the month all lost on the newest third. These
rules were chosen on the same data, so expect less.

Rejected for winning too little: favorites at 90c to under 94c, which earned +$0.10 a trade but win about
$0.37 against a loss of about $4.63.

Quant methods tested against this rule, and why none changed it:

- **Brier decomposition.** Kalshi's price is very well calibrated overall (reliability 0.0003 to 0.0014),
  so edge can only come from narrow conditions.
- **Isotonic calibration.** Walk-forward selection with a 75% floor earned under +$0.10 a trade, against
  +$0.69 for the fixed rule on the same period.
- **Kelly sizing.** $5 is 19% of full Kelly, and about half of full Kelly at the low end of the win rate.
- **VPIN, Glosten-Milgrom, flow toxicity.** The most toxic third of signals won 82.6%, against 88.9%, with no
  steady pattern across six ways of splitting 136 signals.
- **Queue depth, market impact.** A median 5,751 contracts trade at the bid in 5 s, against about 6 for $5.
- **Spread sweeps, adverse selection.** Resting 10 s at the bid, filled only when the price trades through,
  earned +$0.58 a trade against +$0.48, about $5 a month, and most missed fills would have won.
- **Multi-window ramping, repricing.** A second tranche earned +$0.19 an add and breaks the one-trade rule.
  Stop losses lost money. Taking profit at 97c added $2.76 on 81 trades.
- **Avellaneda-Stoikov, GLFT.** These quote both sides as a market maker, which a $5 buyer does not do.

Removed after testing: buying underdogs at 30c or less (wins about 40%, +$2.52 a trade at best, flat
to negative lately), buying the side that just fell (loses), and the earlier trade 5 to 2 minutes
before close (+$0.12 a trade, not statistically distinct from zero). A live BTC model alone lost money
before the last 90 s, and a trained LightGBM model predicted outcomes worse than the market's own price
in 4 of 5 walk-forward periods. The HUD reports each slot's P&L apart.

While live, the bot compares Kalshi's own fills and settlements with its book every 2 minutes
(`src/reconcile.rs`). The HUD shows Kalshi's P&L beside the bot's, with any mismatch. An open position
only Kalshi knows about uses that window's trade, and the daily stop uses the worse of the two P&L
figures. `examples/pnl_report.rs` prints the same comparison market by market.

UFC copies (`src/ufc.rs`) are off unless `UFC_COPY=true`. When on, they check mma-ai.net every 15 minutes and take each new bet the site lists, once,
at $5, when its win chance beats Kalshi's ask plus the fee, up to 5 open. They stay on paper unless
`UFC_LIVE=true` on a live bot. The site's 236 graded bets, at the Vegas price with Kalshi's fee, returned
-3.9%; this filter returned about -1%. Favorites were +1.5% and underdogs -13.8%, and the site's AI
predicted worse than Vegas (Brier 0.222 against 0.211). The exchange check does not cover these trades.

A $1 win is not a $1 average. An average of $1 a trade on $5 needs 61.7% wins at 50c, 85.5% at
70c and 97.1% at 80c.

Orders are immediate-or-cancel through the V2 order API (`/portfolio/events/orders`), and
each trade records its actual fill price and fee.

RISK also needs the analytics engine (`src/analytics.rs`) to agree in the last 90 s. It
must signal the same side with its own 2c of net edge, and the lower of the two engines' win
chances is the one held against the floors and used to call a sure bet. The stake stays the
mode's: the file's own sizing of 10 to 150 contracts is logged on each trade, not used. Its
resting-order branch only logs, because resting orders need tracking the bot does not have.
`ANALYTICS_VETO=false` returns it to logging only. Each window's self-check and
`settle_calib.jsonl` score both engines, so the live record can show whether it earns its place.

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

## Month-long study, Nov 2 2026 (`research/window_study.py`, public data only)

2,958 settled windows, Oct 1 to Nov 2, taker fills at the minute quote, rules found on the
older two thirds and scored on the newer third. Run `report` and `candidate` to reproduce.

- **No time and price beats the market after fees.** Of 192 minute-by-price cells, two passed
  on older data where chance alone predicts about four. On newer data they made +2.8% over
  32 trades, t = 0.48.
- **Fading sharp moves loses.** Buying the side that just fell lost in 13 of 16 splits, and
  -6.9% over 4,660 trades after moves of 15c or more.
- **Buying the cheap side at extreme prices loses.** 1-10c entries ranged from -58% to +6%,
  and every split turns negative without its single best trade.
- **Following sharp moves is roughly break-even.** After moves of 25c or more with 1-5 minutes
  left: 887 trades, 78% wins, +1.8% before slippage, negative at 2c of worse fills, 18 up days
  and 15 down. An earlier version of this test showed more because it picked each window's
  latest move, which live trading cannot know.

No earlier rule clearly beats the market, so NORMAL trades only in the last 2 minutes. These results say nothing about
the settlement engine itself, because Kalshi publishes only the last 60 BRTI prints: its
evidence can only come from live windows and `settle_calib.jsonl`.

## The read, Nov 3 2026 (`research/window_study.py download 3400`, 3,396 windows, Sep 28 to Nov 3)

The live bot filled nothing in its first 25 hours live: 6 orders were refused for insufficient balance
(the account held $0.27) and 7 immediate-or-cancel orders at the exact ask got no fill because the ask
had moved up. Live orders now carry a 2c cushion above the ask (`IOC_CUSHION`), sized so a $5 trade stays
$5; the fill is still at the book's price.

The current rule (10c+ rise into 70-82c or 18c+ into 50-70c, at 2 and 1 minutes left, up to two $5 trades):

| | trades | wins | net | a trade | t |
|---|---|---|---|---|---|
| older two thirds (rules chosen here) | 223 | 78.0% | +$107.57 | +$0.48 | 2.48 |
| newer third | 118 | 73.7% | +$20.83 | +$0.18 | 0.62 |
| after the rules were chosen (Nov 2 02:00 on, 2 days) | 14 | 64.3% | -$6.51 | -$0.47 | -0.51 |
| all, paying 2c more | 344 | 76.2% | about +$0.25 a trade | | |

Out of sample it is 9 wins and 5 losses: too few to say anything, and consistent with no edge. The
newer third's +$0.18 a trade has t = 0.62, not distinct from zero. 36 days: 24 up, 12 down, worst
day -$33.94, worst drop -$39.97. A 30-day bootstrap of those days at $5 gives a 5th percentile of
-$14 and a median of +$96, but the days are in-sample and the newest ones are the worst.

**Resting at the bid is adversely selected, and is off the table.** With no maker fee, a bid that
filled would earn +$0.59 a trade if every order filled. But using the next minute's candle to tell
which bids the market came down to: the filled orders won 28% and lost $2.78 a trade (58 trades,
t = -6.6); the orders the market never came back to won 93%. The same split holds in every part of
the sample. A rise signal that gets filled passively is one that reversed. Cross the spread or stay out.

**Settlement engine**: 7 live windows in `settle_calib.jsonl`, the right side 34 of 35 times from 45 s
down, 6 of 7 at 60 s. Only one of the seven had a tradable price (70c, won $1.99); four were already at
98c or more, one was under the 90% floor. It is the only part of the bot with a structural reason to
win, and it has one scored trade. Its evidence can only come from live windows.

What the $60 live run is for: a true out-of-sample read of the sharp-rise rule at $5, roughly 10 trades
a day. If 200 live trades do not clear about +$0.15 a trade after fees, the rule has no edge and should
be turned off; the settlement engine's log keeps scoring either way. Do not raise the stake or switch to
RISK on fewer than that.

## Honest expectations

On a 45¢ contract with $5, the most you can win is about $6, not $10. A "slight edge" at
these prices is cents per contract; with $5 trades that is cents per trade. Volume only
turns cents into dollars if the edge is real, which is exactly what the paper run measures.

## The read, Nov 4 2026 (same 3,396 windows, plus the live log)

The live bot still had no fill after 2 days: the account held $0.03, the $60 having gone into two NFL
positions placed from the account, and the VPS ran the binary from before the cushion. Scoring the 29
refused or unfilled orders against the settled results gave 17 wins and 12 losses, about -$15 at $5 each.

One of them, YES at 79c after a 68c rise in the last minute, pointed at the size of the rise. Buying the
rising side at the 1-minute check, by rise over the prior 60 s, $5 a trade after fees:

| rise | 70-82c | 50-70c |
|---|---|---|
| under 10c | 10 trades, 70%, -$0.53 a trade | 29, 59%, -$0.30 |
| 10-19c | 22, 73%, -$0.29 | 17, 47%, -$1.08 |
| 20-29c | 18, 89%, +$0.72 | 19, 74%, +$0.83 |
| 30c+ | 50, 84%, +$0.37 | 34, 74%, +$0.75 |

The same split at the 2-minute check is mixed (10-19c into 70-82c +$0.41, 30c+ -$0.20), so that check
goes. The rule is now a 20c+ rise into 50-82c, checked once with 1 minute left: 121 trades, 3.4 a day,
80.2% wins, +$72.87, +$0.60 a trade, +$0.47 paying 2c more, 24 of 36 days up, worst day -$9.47, and
positive in all three thirds (+$10.95, +$42.78, +$19.15). The last 7 days are 29 trades, 69% wins,
-$4.39, and the book in these windows moves 50c in five seconds, so fills are the open question. Chosen on
the same data again: the 96-trade paper run (`PAPER_TRADE_LIMIT=96`, about 4 weeks) is its test, and it needs
about +$0.15 a trade after fees to keep.

## The read, Nov 4 2026, second pass: more trades a day

540 variants of the sharp-rise rule (rise 10-30c, price bands from 30c to 96c, checks at 1 to 5 minutes,
one or two trades a window), chosen on the older 25 days and scored on the newest 13. Nearly every variant
that trades more than 10 times a day on the older days loses on the newer ones. The exceptions all take a
25c+ rise into 30-82c; the best, checked every minute from 5 out with one trade a window, is the new
NORMAL rule:

| | trades | a day | wins | net | a trade | paying 2c more |
|---|---|---|---|---|---|---|
| older two thirds | 403 | 16.1 | 68% | +$98 | +$0.24 | +$0.10 |
| newest third | 205 | 15.8 | 71% | +$81 | +$0.40 | +$0.23 |
| whole month | 608 | 16.4 | 69% | +$179 | +$0.30 | +$0.13 |

Positive in all three thirds, 25 of 37 days up, worst day -$33, worst drop -$53. By check: 5 min +$0.13 a
trade, 4 min +$0.31, 3 min +$0.43, 2 min -$0.06, 1 min +$0.81. By price: 30-49c entries are 106 trades
winning 54% for +$107, 50-82c are 502 trades winning 73% for +$73, so half the profit is the cheap side.
The narrow 1-minute rule (121 trades, +$0.60 a trade) now runs as the shadow.

**Stake for $10 a day.** The month's edge is about $4.90 a day at $5 before slippage and $2.24 at 2c
more. $10 a day needs $10 a trade before slippage or $20 at 2c, and the worst day scales with it: -$68
at $10 (4 days past the $30 daily stop), -$139 at $20 (10 days). The paper run at $5 says what the fills
actually cost; the stake is set after it, not before.

**Other coins.** Kalshi runs the same market, with the same CF Benchmarks settlement, on ETH, SOL, XRP,
DOGE and others. On 7-13 days of public data none of them carries either rule: ETH loses under both (a 4c
spread at the last minute against 1c on BTC), the wide rule loses on XRP (-$0.34 a trade) and SOL (-$0.18)
and is flat on DOGE, and the narrow rule is positive on SOL and XRP only in windows that mostly have no
quote in the last minute. BTC is the only market with the depth for this.
