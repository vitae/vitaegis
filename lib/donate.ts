/* Vitaegis Bitcoin donation endpoints (Strike, Vitaegis account).
   The Lightning address is permanent and reusable. The QR images in
   public/donate/ encode these exact strings; regenerate them if these change. */

export const LIGHTNING_ADDRESS = 'vitaegis@strike.me';
export const ONCHAIN_ADDRESS = 'bc1q827gcfh0m0uj69ylzhdx2hjfpgryadghkwm4sp';

export const LIGHTNING_URI = `lightning:${LIGHTNING_ADDRESS}`;
export const ONCHAIN_URI = `bitcoin:${ONCHAIN_ADDRESS}`;

export const LIGHTNING_QR = '/donate/lightning.svg';
export const ONCHAIN_QR = '/donate/onchain.svg';
