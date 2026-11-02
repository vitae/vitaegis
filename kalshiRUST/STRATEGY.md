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
3. **Enters late.** NORMAL: one trade a window, only in the last 2 minutes, at a 75%+ win chance. RISK: the last 90 s, plus the early engine from 7 minutes out.
4. **Caps size.** NORMAL $5 per trade, 1 per window, and live trading stops for the UTC day after a $30 loss. RISK up to $100, 2 per window.
5. **Paper first.** `LIVE_TRADING=false` logs every signal to `trades.jsonl` and
   Supabase, settles against Kalshi's result, and reports P&L after fees. The run stops
   after 8 settled 15-minute trades so the edge can be read before any money moves.
6. **Sniper (paper only).** Every 60 s it prices every open Kalshi Bitcoin price market except the
   15-minute one, found from Kalshi's series list. Markets that pay on touching a level use twice
   the chance of ending beyond it. It lists YES picks with a 75%+ win chance and 3¢ of edge at
   0.75x, 1x and 1.5x volatility, with a 45% a year volatility floor beyond a day, top 15 by
   expected profit. Picks closing within a day get a $5 paper trade, up to 5 open.

## Modes

The HUD's red RISK button writes `kalshirust_config.mode`; the bot polls it every 10 s.

| | NORMAL | RISK |
|---|---|---|
| Trades a window | 2 | 2 |
| Entry | one trade a window, only in the last 2 minutes | last 90 s, plus the early engine from 7 min out |
| Last-90 trade | 75%+ win chance; 90% and 3c of edge before 3 prints exist unless the price is 62.5c or less | 60%+ win chance, 5c of edge |
| Second last-90 trade | none | 70%+, same side, 10 s later |
| Stake | $5 flat (`SURE_BET_MULT` above 1 raises it at 95%+ with 15 prints) | 0.75 Kelly on the bankroll, $5 to $100 |
| Other floors | 2c of edge, $0.15 expected profit, 97c top price | $0.50 expected profit, 97c top price |

Every NORMAL trade needs a 75%+ win chance, and none buys a falling price. NORMAL makes one trade a
window (`BETS_PER_WINDOW`), in the last 2 minutes, by whichever of two rules fires first:

- **Sharp rise.** With 2 minutes and then 1 minute left, the side whose mid rose 12c or more over the
  prior minute, at 72c to 82c.
- **Settlement math.** In the last 90 s, a 75%+ win chance from both engines, at 60c or less or at 72c to
  82c. It skips a side whose mid fell 1c or more over the last 30 s, or that has under 15 s of price history.

A win must pay over $1 after fees, because a small win cannot make up for a loss of about $4.75.

On the month of data the sharp-rise rule is 155 trades, 87.1% wins against 79% needed to break even, +$0.51 a
trade, about +$2.38 a day, worst drop $16.39. It is positive in all three parts of the month (+$0.15, +$1.17,
+$0.23 a trade), has t=3.16, and stays positive at 2c of worse fills (+$0.23). Buyers paid about the quoted
price in the first 3 s after signals. It was the most profitable of 72 combinations of timing, move size and
price that won 75%+, stayed positive in every part of the month and at worse fills, with no small wins. Starting at 3
minutes made more in total but about nothing in the newest part of the month, with a worst drop of $33.
These rules were picked from well over a hundred tried on the same data, so expect less.

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

Both modes also need the analytics engine (`src/analytics.rs`) to agree in the last 90 s. It
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

## Honest expectations

On a 45¢ contract with $5, the most you can win is about $6, not $10. A "slight edge" at
these prices is cents per contract; with $5 trades that is cents per trade. Volume only
turns cents into dollars if the edge is real, which is exactly what the paper run measures.
