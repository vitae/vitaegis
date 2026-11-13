import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'VITAEGIS: Health, Stealth, Wealth';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const jost = await readFile(join(process.cwd(), 'lib/fonts/Jost-SemiBold.ttf'));
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(ellipse at 50% 60%, #013a01 0%, #000 62%)',
        fontFamily: 'Jost',
      }}
    >
      <div
        style={{
          fontSize: 168,
          letterSpacing: 14,
          color: '#00ff00',
          textShadow: '0 0 60px rgba(0,255,0,0.55)',
        }}
      >
        VITAEGIS
      </div>
      <div style={{ width: 220, height: 2, backgroundColor: '#00ff00', marginTop: 8 }} />
      <div style={{ marginTop: 36, fontSize: 40, letterSpacing: 16, color: '#fff' }}>
        HEALTH • STEALTH • WEALTH
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Jost', data: jost, weight: 600, style: 'normal' }] },
  );
}
