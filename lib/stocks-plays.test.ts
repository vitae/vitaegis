import { describe, expect, it } from 'vitest';
import { parseChain } from './stocks-plays';

const strike = (s: string, call: [string, string, string], put: [string, string, string]) => ({
  expirygroup: '',
  strike: s,
  c_Bid: call[0],
  c_Ask: call[1],
  c_Last: call[2],
  p_Bid: put[0],
  p_Ask: put[1],
  p_Last: put[2],
});

describe('parseChain', () => {
  const json = {
    data: {
      lastTrade: 'LAST TRADE: $1,143.89 (AS OF NOV 25, 2026 12:29 PM ET)',
      table: {
        rows: [
          { expirygroup: 'December 18, 2026', strike: null },
          strike('1,140.00', ['13.75', '13.90', '13.70'], ['9.40', '9.55', '9.56']),
          strike('1,145.00', ['--', '--', '11.00'], ['--', '0.00', '--']),
        ],
      },
    },
  };

  it('reads the share price, the expiry and each strike', () => {
    const chain = parseChain(json);
    expect(chain?.last).toBe(1143.89);
    expect(chain?.expiry).toBe('2026-12-18');
    expect(chain?.asOf).toBe('Nov 25, 2026 12:29 PM ET');
    expect(chain?.rows[0]).toEqual({
      strike: 1140,
      call: { bid: 13.75, ask: 13.9, last: 13.7 },
      put: { bid: 9.4, ask: 9.55, last: 9.56 },
    });
  });

  it('reads a missing or zero quote as no quote', () => {
    expect(parseChain(json)?.rows[1]).toEqual({
      strike: 1145,
      call: { bid: null, ask: null, last: 11 },
      put: { bid: null, ask: null, last: null },
    });
  });

  it('keeps only the latest expiry when the answer spans two', () => {
    const rows = [
      { expirygroup: 'December 17, 2026' },
      strike('10.00', ['1', '1', '1'], ['1', '1', '1']),
      { expirygroup: 'December 18, 2026' },
      strike('20.00', ['2', '2', '2'], ['2', '2', '2']),
    ];
    const chain = parseChain({
      data: { lastTrade: 'LAST TRADE: $15 (AS OF NOV 25, 2026)', table: { rows } },
    });
    expect(chain?.expiry).toBe('2026-12-18');
    expect(chain?.rows.map((r) => r.strike)).toEqual([20]);
  });

  it('answers null without a share price or without strikes', () => {
    expect(parseChain({ data: { lastTrade: null, table: json.data.table } })).toBeNull();
    expect(
      parseChain({ data: { lastTrade: json.data.lastTrade, table: { rows: [] } } }),
    ).toBeNull();
    expect(parseChain({ data: null })).toBeNull();
    expect(parseChain({})).toBeNull();
  });
});
