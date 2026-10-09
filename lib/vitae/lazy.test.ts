import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/* The ElevenLabs SDK pulls in the WebRTC stack. Only the conversation component may import
   it, and the two places that mount that component must load it lazily, so no page pays for
   it until Vitae actually renders. */
describe('Vitae loads lazily', () => {
  for (const file of ['components/vitae/VitaeOrb.tsx', 'components/vitae/VitaePanel.tsx']) {
    it(`${file} loads VitaeConversation with next/dynamic`, () => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/^import .*VitaeConversation/m);
      expect(src).toMatch(/dynamic\(\(\) => import\(.*VitaeConversation/);
    });
  }
  it('the /vitae page never imports the conversation itself', () => {
    expect(readFileSync('app/vitae/page.tsx', 'utf8')).not.toContain('VitaeConversation');
  });
  it('only the conversation component imports @elevenlabs/react', () => {
    for (const file of [
      'components/vitae/VitaeOrb.tsx',
      'components/vitae/useVitaeTools.ts',
      'app/vitae/page.tsx',
      'app/layout.tsx',
    ]) {
      expect(readFileSync(file, 'utf8')).not.toContain('@elevenlabs/react');
    }
  });
});
