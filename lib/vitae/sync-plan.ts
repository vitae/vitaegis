import type { KnowledgeDoc } from './knowledge';
import type { VitaeToolDef } from './tools';

/* ═══════════════════════════════════════════════════════════════════════════════
   Vitae · sync plan
   Pure decisions for scripts/vitae-sync.ts: what to create, patch and delete so a
   second run replaces rather than duplicates.
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Tools are matched by name: existing ones are patched, missing ones created. */
export function planToolSync(
  existing: { id: string; name: string }[],
  wanted: VitaeToolDef[],
): { create: VitaeToolDef[]; update: { id: string; def: VitaeToolDef }[] } {
  const byName = new Map(existing.map((t) => [t.name, t.id]));
  const create: VitaeToolDef[] = [];
  const update: { id: string; def: VitaeToolDef }[] = [];
  for (const def of wanted) {
    const id = byName.get(def.name);
    if (id) update.push({ id, def });
    else create.push(def);
  }
  return { create, update };
}

/** Knowledge is replaced wholesale: every prefixed document goes, every wanted one is created. */
export function planKnowledgeSync(
  existing: { id: string; name: string }[],
  wanted: KnowledgeDoc[],
): { deleteIds: string[]; create: KnowledgeDoc[] } {
  return { deleteIds: existing.map((d) => d.id), create: wanted };
}
