import { describe, it, expect } from 'vitest';
import {
  grantCodingEventResources,
  capResources,
  simulateFaucetEvent,
} from '../src/engine/economy.js';
import { createEmptyKeep } from '../src/engine/grid.js';
import {
  CODING_EVENT_GRANTS,
  DAILY_RESOURCE_CAP,
  STARTING_RESOURCES,
  type CodingEvent,
} from '@codekeep/shared';

describe('economy — resource grants', () => {
  it('resources_coding_event_maps_to_correct_grant', () => {
    const keep = createEmptyKeep('p1', 'Test');
    const event: CodingEvent = {
      type: 'git_commit',
      timestamp: Date.now(),
      grants: CODING_EVENT_GRANTS.git_commit,
    };

    const updated = grantCodingEventResources(keep, event);
    const grant = CODING_EVENT_GRANTS.git_commit;

    expect(updated.resources.gold).toBe(STARTING_RESOURCES.gold + grant.gold);
    expect(updated.resources.wood).toBe(STARTING_RESOURCES.wood + grant.wood);
    expect(updated.resources.stone).toBe(STARTING_RESOURCES.stone + grant.stone);
  });

  it('resources_grant_respects_cap', () => {
    const keep = createEmptyKeep('p1', 'Test');
    keep.resources = {
      gold: DAILY_RESOURCE_CAP.gold * 10,
      wood: DAILY_RESOURCE_CAP.wood * 10,
      stone: DAILY_RESOURCE_CAP.stone * 10,
    };

    const event: CodingEvent = {
      type: 'build_success',
      timestamp: Date.now(),
      grants: CODING_EVENT_GRANTS.build_success,
    };

    const updated = grantCodingEventResources(keep, event);

    expect(updated.resources.gold).toBe(DAILY_RESOURCE_CAP.gold * 10);
    expect(updated.resources.wood).toBe(DAILY_RESOURCE_CAP.wood * 10);
    expect(updated.resources.stone).toBe(DAILY_RESOURCE_CAP.stone * 10);
  });
});

describe('economy — faucet', () => {
  it('simulateFaucetEvent_returns_valid_event', () => {
    const event = simulateFaucetEvent();

    expect(['build_success', 'tests_pass', 'git_commit', 'session_reward']).toContain(
      event.type,
    );
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.grants).toBeDefined();
    expect(event.grants.gold).toBeGreaterThanOrEqual(0);
    expect(event.grants.wood).toBeGreaterThanOrEqual(0);
    expect(event.grants.stone).toBeGreaterThanOrEqual(0);

    const expectedGrant = CODING_EVENT_GRANTS[event.type];
    expect(event.grants).toEqual(expectedGrant);
  });
});
