import { describe, it, expect } from 'vitest';
import { grantCodingEventResources } from '../src/engine/economy.js';
import { createEmptyKeep } from '../src/engine/grid.js';
import { STARTING_RESOURCES, type CodingEvent } from '@codekeep/shared';

describe('economy — branch coverage', () => {
  it('uses custom grants when provided on event', () => {
    const keep = createEmptyKeep('p1', 'Test');
    const customGrants = { gold: 99, wood: 88, stone: 77 };
    const event: CodingEvent = {
      type: 'git_commit',
      timestamp: Date.now(),
      grants: customGrants,
    };
    const updated = grantCodingEventResources(keep, event);
    expect(updated.resources.gold).toBe(STARTING_RESOURCES.gold + 99);
    expect(updated.resources.wood).toBe(STARTING_RESOURCES.wood + 88);
    expect(updated.resources.stone).toBe(STARTING_RESOURCES.stone + 77);
  });

  it('falls back to CODING_EVENT_GRANTS when event.grants is undefined', () => {
    const keep = createEmptyKeep('p1', 'Test');
    const event = {
      type: 'git_commit' as const,
      timestamp: Date.now(),
    } as CodingEvent;
    const updated = grantCodingEventResources(keep, event);
    expect(updated.resources.gold).toBeGreaterThan(STARTING_RESOURCES.gold);
  });
});
