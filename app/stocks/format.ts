// How /stocks writes money and percentages. A loss is red and wears a real minus sign.

export const cents = (n: number) => Math.round(n * 100) / 100;
export const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');

export const usd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const signedUsd = (n: number) => {
  const c = cents(n);
  return `${sign(c)}$${usd(Math.abs(c))}`;
};

export const signedPct = (n: number, digits = 2) => {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return `${sign(r)}${Math.abs(r).toFixed(digits)}%`;
};

export const tone = (n: number) => {
  const c = cents(n);
  return c > 0 ? 'text-vitae-green' : c < 0 ? 'text-vitae-red' : 'text-white/70';
};
