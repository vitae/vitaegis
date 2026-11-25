import { describe, expect, it } from 'vitest';
import { parseClose, parseWatchlist } from './stocks-live';

const row = (symbol: string, lastSalePrice: string, marketStatus = 'Market Open') => ({
  symbol,
  lastSalePrice,
  lastTradeTimestampDateTime: '2026-11-25T11:52:42.2443278-05:00',
  marketStatus,
});

describe('parseWatchlist', () => {
  it('reads each last sale and the New York date while the market is open', () => {
    const quotes = parseWatchlist({ data: [row('NVDA', '$141.6998'), row('MU', '$1,204.50')] });
    expect(quotes).toEqual({
      NVDA: { date: '2026-11-25', price: 141.6998 },
      MU: { date: '2026-11-25', price: 1204.5 },
    });
  });

  it('answers null outside the regular session, whatever prices are listed', () => {
    for (const status of ['After-Hours', 'Pre-Market', 'Market Closed', 'Closed', '']) {
      expect(parseWatchlist({ data: [row('NVDA', '$141.70', status)] })).toBeNull();
    }
    expect(parseWatchlist({ data: null })).toBeNull();
    expect(parseWatchlist({})).toBeNull();
  });

  it('drops rows without a usable price', () => {
    const quotes = parseWatchlist({ data: [row('NVDA', '$141.70'), row('ANT', 'N/A')] });
    expect(Object.keys(quotes ?? {})).toEqual(['NVDA']);
  });
});

describe('parseClose', () => {
  const closed = {
    lastSalePrice: '$155.38',
    lastTradeTimestamp: 'Closed at Nov 24, 2026 4:00 PM ET',
  };

  it('reads the close and its date once the market has shut', () => {
    expect(parseClose({ data: { primaryData: closed, secondaryData: null } })).toEqual({
      date: '2026-11-24',
      price: 155.38,
    });
  });

  it('prefers the close over an after-hours or pre-market trade', () => {
    const late = { lastSalePrice: '$150.10', lastTradeTimestamp: 'Nov 24, 2026 7:59 PM ET' };
    expect(parseClose({ data: { primaryData: late, secondaryData: closed } })?.price).toBe(155.38);
  });

  it('pads a one-digit day', () => {
    const early = {
      lastSalePrice: '$10.00',
      lastTradeTimestamp: 'Closed at Dec 1, 2026 4:00 PM ET',
    };
    expect(parseClose({ data: { primaryData: early } })?.date).toBe('2026-12-01');
  });

  it('answers null while the market is trading or when nothing is labelled a close', () => {
    const trading = { lastSalePrice: '$141.81', lastTradeTimestamp: 'Nov 25, 2026 11:52 AM ET' };
    expect(parseClose({ data: { primaryData: trading, secondaryData: null } })).toBeNull();
    expect(parseClose({ data: null })).toBeNull();
    expect(parseClose({})).toBeNull();
  });
});
