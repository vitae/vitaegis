/* Vitaegis Bitcoin donation endpoints (Strike, Vitaegis account).
   The Lightning address is permanent and reusable. The QR images in
   public/donate/ encode these exact strings; regenerate them if these change. */

export const LIGHTNING_ADDRESS = 'vitaegis@strike.me';
export const ONCHAIN_ADDRESS = 'bc1q827gcfh0m0uj69ylzhdx2hjfpgryadghkwm4sp';
/* Monero primary address (or a dedicated subaddress) from Cake Wallet. Permanent and safe to
   reuse: Monero derives a one-time stealth address on chain for every payment. The Monero rail is
   hidden if this is ever emptied. */
export const MONERO_ADDRESS =
  '49a7q7N9HLZ6SG25vw55o72jqbkSsLTy5hBxfcvqtsXbWoaYUSTsfau8VJgposmrW1fjYjrGuXisQZ1Pw4Ca18XiAMjaH9v';

export const LIGHTNING_URI = `lightning:${LIGHTNING_ADDRESS}`;
export const ONCHAIN_URI = `bitcoin:${ONCHAIN_ADDRESS}`;
export const MONERO_URI = `monero:${MONERO_ADDRESS}`;

export const LIGHTNING_QR = '/donate/lightning.svg';
export const ONCHAIN_QR = '/donate/onchain.svg';
export const MONERO_QR = '/donate/monero.svg';

/** Vitae orange (#FF8000): full-intensity orange matched to the brand green #00FF00. */
export const VITAE_ORANGE = '#ff8000';
export const BITCOIN_ORANGE = VITAE_ORANGE;
export const MONERO_ORANGE = VITAE_ORANGE;

export interface Rail {
  key: 'monero' | 'lightning' | 'onchain';
  tag: string;
  label: string;
  note: string;
  value: string;
  uri: string;
  qr: string;
  color: string;
}

/** Every rail with an address, Monero first (left), then Lightning, then on-chain. */
const ALL_RAILS: Rail[] = [
  {
    key: 'monero',
    tag: 'ɱ Monero',
    label: 'XMR for Privacy',
    note: 'Private by default. One permanent address; every payment lands on a fresh stealth address.',
    value: MONERO_ADDRESS,
    uri: MONERO_URI,
    qr: MONERO_QR,
    color: MONERO_ORANGE,
  },
  {
    key: 'lightning',
    tag: '⚡ Lightning',
    label: 'Bitcoin Lightning for Tips',
    note: 'Instant, near-zero fees. Any amount, any Lightning wallet. Best for tips.',
    value: LIGHTNING_ADDRESS,
    uri: LIGHTNING_URI,
    qr: LIGHTNING_QR,
    color: BITCOIN_ORANGE,
  },
  {
    key: 'onchain',
    tag: '₿ Bitcoin',
    label: 'Bitcoin On-Chain for Large Amounts',
    note: 'Regular bitcoin transaction. Network fees apply. Best for larger amounts.',
    value: ONCHAIN_ADDRESS,
    uri: ONCHAIN_URI,
    qr: ONCHAIN_QR,
    color: BITCOIN_ORANGE,
  },
];
export const DONATION_RAILS: Rail[] = ALL_RAILS.filter((r) => r.value);
