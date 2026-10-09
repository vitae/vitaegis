import { describe, expect, it } from 'vitest';
import { planKnowledgeSync, planToolSync } from './sync-plan';
import type { VitaeToolDef } from './tools';

const def = (name: VitaeToolDef['name']): VitaeToolDef => ({
  name,
  description: 'd',
  parameters: { type: 'object', properties: {}, required: [] },
  expects_response: true,
});

describe('planToolSync', () => {
  it('updates tools that exist by name and creates the rest', () => {
    const plan = planToolSync(
      [{ id: 't1', name: 'open_page' }],
      [def('open_page'), def('subscribe_email')],
    );
    expect(plan.update).toEqual([{ id: 't1', def: def('open_page') }]);
    expect(plan.create).toEqual([def('subscribe_email')]);
  });
  it('is a no-create plan on a second run', () => {
    const existing = [
      { id: 't1', name: 'open_page' },
      { id: 't2', name: 'start_checkout' },
      { id: 't3', name: 'subscribe_email' },
    ];
    const plan = planToolSync(existing, [
      def('open_page'),
      def('start_checkout'),
      def('subscribe_email'),
    ]);
    expect(plan.create).toEqual([]);
    expect(plan.update).toHaveLength(3);
  });
});

describe('planKnowledgeSync', () => {
  it('deletes every existing prefixed document and creates every wanted one', () => {
    const plan = planKnowledgeSync(
      [
        { id: 'd1', name: 'vitae:store' },
        { id: 'd2', name: 'vitae:old' },
      ],
      [{ name: 'vitae:store', text: 'x' }],
    );
    expect(plan.deleteIds).toEqual(['d1', 'd2']);
    expect(plan.create).toEqual([{ name: 'vitae:store', text: 'x' }]);
  });
});
