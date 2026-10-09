/** Server side: the token route can mint tokens. */
export function vitaeServerEnabled(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID?.trim());
}

/** Client side: the orb and /vitae render. The flag is the literal "1". */
export function vitaeClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VITAE_ENABLED === '1';
}
