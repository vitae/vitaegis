// Donation rails: Bitcoin over Lightning (a Strike address), Bitcoin on-chain, and Monero.
// Each is one env var; a rail with no address is simply not shown. Addresses are encoded as
// wallet URIs (lightning:, bitcoin:, monero:) so scanning opens a payment in Strike, Cake
// Wallet or any other wallet. The QR is drawn as SVG rects from the module matrix, which is
// synchronous and works both in React and inside the resvg card renderer.

import QRCode from 'qrcode';
import { LIGHTNING_ADDRESS, MONERO_ADDRESS, ONCHAIN_ADDRESS } from './donate';

/** Bitcoin orange, the colour every Bitcoin address and label is set in. */
/** Vitae orange (#FF8000): full-intensity orange matched to the brand green #00FF00. */
export const VITAE_ORANGE = '#ff8000';
export const BITCOIN_ORANGE = VITAE_ORANGE;
/** Monero orange. */
export const MONERO_ORANGE = VITAE_ORANGE;

export type RailId = 'lightning' | 'bitcoin' | 'monero';

export interface DonationRail {
  id: RailId;
  /** Short tab label. */
  tab: string;
  /** What it is, spelled out under the QR. */
  label: string;
  address: string;
  /** Wallet URI the QR encodes. */
  uri: string;
  color: string;
}

const env = (name: string) => {
  const v = process.env[name]?.trim();
  return v ? v : null;
};

/** The configured Lightning address, or null when tips are off. */
export function lightningAddress(): string | null {
  return env('NEXT_PUBLIC_LIGHTNING_ADDRESS') ?? (LIGHTNING_ADDRESS || null);
}

/** LUD-16 style URI: wallets open a payment to the address. */
export const lightningUri = (address: string) => `lightning:${address}`;
export const bitcoinUri = (address: string) => `bitcoin:${address}`;
export const moneroUri = (address: string) => `monero:${address}`;

/**
 * Every rail with an address set, in display order. Read in the browser through
 * NEXT_PUBLIC_* at build time and on the server at request time.
 */
export function donationRails(overrides?: Partial<Record<RailId, string | null>>): DonationRail[] {
  const ln = overrides?.lightning ?? lightningAddress();
  const btc = overrides?.bitcoin ?? env('NEXT_PUBLIC_BITCOIN_ADDRESS') ?? (ONCHAIN_ADDRESS || null);
  const xmr = overrides?.monero ?? env('NEXT_PUBLIC_MONERO_ADDRESS') ?? (MONERO_ADDRESS || null);
  const rails: DonationRail[] = [];
  if (xmr)
    rails.push({
      id: 'monero',
      tab: 'Monero',
      label: 'Monero (XMR)',
      address: xmr,
      uri: moneroUri(xmr),
      color: MONERO_ORANGE,
    });
  if (ln)
    rails.push({
      id: 'lightning',
      tab: 'Lightning',
      label: 'Bitcoin Lightning',
      address: ln,
      uri: lightningUri(ln),
      color: BITCOIN_ORANGE,
    });
  if (btc)
    rails.push({
      id: 'bitcoin',
      tab: 'On-chain',
      label: 'Bitcoin on-chain',
      address: btc,
      uri: bitcoinUri(btc),
      color: BITCOIN_ORANGE,
    });
  return rails;
}

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
 * `side` units wide. The caller leaves a white quiet zone around it.
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

/** Shorten a long address for display: first 10 and last 8 characters. */
export const shortAddress = (a: string, head = 10, tail = 8) =>
  a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;
