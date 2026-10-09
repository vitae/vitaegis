// Bitcoin Lightning tips. One address (a Strike username, e.g. "vitaegis@strike.me"), encoded
// as a `lightning:` URI so any Lightning wallet, Strike included, opens a payment to it when the
// QR is scanned. The QR is drawn as SVG rects from the module matrix, which is synchronous and
// works both in React and inside the resvg card renderer.

import QRCode from 'qrcode';

/** Bitcoin orange, the colour every address and label is set in. */
export const BITCOIN_ORANGE = '#f7931a';

/** The configured Lightning address, or null when tips are off. */
export function lightningAddress(): string | null {
  const a = process.env.NEXT_PUBLIC_LIGHTNING_ADDRESS?.trim();
  return a ? a : null;
}

/** LUD-16 style URI: wallets open a payment to the address. */
export const lightningUri = (address: string) => `lightning:${address}`;

export interface QrMatrix {
  size: number;
  /** Row-major booleans, true = dark module. */
  dark: boolean[];
}

export function qrMatrix(text: string): QrMatrix {
  const code = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = code.modules.size;
  const dark: boolean[] = [];
  for (let i = 0; i < size * size; i++) dark.push(Boolean(code.modules.data[i]));
  return { size, dark };
}

/**
 * One SVG <path> drawing every dark module of the matrix, scaled so the whole code is
 * `side` units wide, with `quiet` modules of white margin accounted for by the caller.
 */
export function qrPath(m: QrMatrix, side: number): string {
  const unit = side / m.size;
  const d: string[] = [];
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.dark[r * m.size + c]) continue;
      d.push(
        `M${(c * unit).toFixed(2)} ${(r * unit).toFixed(2)}h${unit.toFixed(2)}v${unit.toFixed(2)}h-${unit.toFixed(2)}z`,
      );
    }
  }
  return d.join('');
}
