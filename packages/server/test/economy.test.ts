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

    expect(updated.resources.compute).toBe(STARTING_RESOURCES.compute + grant.compute);
    expect(updated.resources.memory).toBe(STARTING_RESOURCES.memory + grant.memory);
    expect(updated.resources.bandwidth).toBe(STARTING_RESOURCES.bandwidth + grant.bandwidth);
  });

  it('resources_grant_respects_cap', () => {
    const keep = createEmptyKeep('p1', 'Test');
    keep.resources = {
      compute: DAILY_RESOURCE_CAP.compute * 10,
      memory: DAILY_RESOURCE_CAP.memory * 10,
      bandwidth: DAILY_RESOURCE_CAP.bandwidth * 10,
    };

    const event: CodingEvent = {
      type: 'build_success',
      timestamp: Date.now(),
      grants: CODING_EVENT_GRANTS.build_success,
    };

    const updated = grantCodingEventResources(keep, event);

    expect(updated.resources.compute).toBe(DAILY_RESOURCE_CAP.compute * 10);
    expect(updated.resources.memory).toBe(DAILY_RESOURCE_CAP.memory * 10);
    expect(updated.resources.bandwidth).toBe(DAILY_RESOURCE_CAP.bandwidth * 10);
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
    expect(event.grants.compute).toBeGreaterThanOrEqual(0);
    expect(event.grants.memory).toBeGreaterThanOrEqual(0);
    expect(event.grants.bandwidth).toBeGreaterThanOrEqual(0);

    const expectedGrant = CODING_EVENT_GRANTS[event.type];
    expect(event.grants).toEqual(expectedGrant);
  });
});
