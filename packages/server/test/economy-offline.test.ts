import { describe, it, expect } from 'vitest';
import { calculateOfflineResources, capResources } from '../src/engine/economy.js';
import type { KeepGridState, PlacedStructure } from '@codekeep/shared';
import {
  PASSIVE_INCOME_INTERVAL_MS,
  PASSIVE_INCOME_PER_VAULT,
  PASSIVE_INCOME_PER_RELAY,
  DAILY_RESOURCE_CAP,
} from '@codekeep/shared';

function makeStructure(
  kind: PlacedStructure['kind'],
  x: number,
  y: number,
  level: PlacedStructure['level'] = 1,
): PlacedStructure {
  return {
    id: `${kind}-${x}-${y}`,
    kind,
    level,
    pos: { x, y },
    placedAtUnixMs: 0,
  };
}

describe('economy — calculateOfflineResources', () => {
  it('returns_zero_when_elapsed_is_zero', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('dataVault', 8, 8)],
    };

    const resources = calculateOfflineResources(grid, 0);
    expect(resources.compute).toBe(0);
    expect(resources.memory).toBe(0);
    expect(resources.bandwidth).toBe(0);
  });

  it('returns_zero_when_no_vaults_or_relays', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('firewall', 4, 4),
        makeStructure('honeypot', 6, 6),
        makeStructure('scanner', 8, 8),
      ],
    };

    const resources = calculateOfflineResources(grid, PASSIVE_INCOME_INTERVAL_MS * 10);
    expect(resources.compute).toBe(0);
    expect(resources.memory).toBe(0);
    expect(resources.bandwidth).toBe(0);
  });

  it('calculates_income_from_vaults', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 5, 5),
        makeStructure('dataVault', 10, 10),
      ],
    };

    const intervals = 5;
    const elapsed = PASSIVE_INCOME_INTERVAL_MS * intervals;
    const resources = calculateOfflineResources(grid, elapsed);

    expect(resources.compute).toBe(intervals * 2 * PASSIVE_INCOME_PER_VAULT.compute);
    expect(resources.memory).toBe(intervals * 2 * PASSIVE_INCOME_PER_VAULT.memory);
    expect(resources.bandwidth).toBe(intervals * 2 * PASSIVE_INCOME_PER_VAULT.bandwidth);
  });

  it('calculates_income_from_relays', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('relayTower', 5, 5),
        makeStructure('relayTower', 10, 10),
        makeStructure('relayTower', 3, 3),
      ],
    };

    const intervals = 3;
    const elapsed = PASSIVE_INCOME_INTERVAL_MS * intervals;
    const resources = calculateOfflineResources(grid, elapsed);

    expect(resources.compute).toBe(intervals * 3 * PASSIVE_INCOME_PER_RELAY.compute);
    expect(resources.memory).toBe(intervals * 3 * PASSIVE_INCOME_PER_RELAY.memory);
    expect(resources.bandwidth).toBe(intervals * 3 * PASSIVE_INCOME_PER_RELAY.bandwidth);
  });

  it('combines_vault_and_relay_income', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 5, 5),
        makeStructure('relayTower', 10, 10),
      ],
    };

    const intervals = 4;
    const elapsed = PASSIVE_INCOME_INTERVAL_MS * intervals;
    const resources = calculateOfflineResources(grid, elapsed);

    const expectedCompute = intervals * (PASSIVE_INCOME_PER_VAULT.compute + PASSIVE_INCOME_PER_RELAY.compute);
    const expectedMemory = intervals * (PASSIVE_INCOME_PER_VAULT.memory + PASSIVE_INCOME_PER_RELAY.memory);
    const expectedBandwidth = intervals * (PASSIVE_INCOME_PER_VAULT.bandwidth + PASSIVE_INCOME_PER_RELAY.bandwidth);

    expect(resources.compute).toBe(expectedCompute);
    expect(resources.memory).toBe(expectedMemory);
    expect(resources.bandwidth).toBe(expectedBandwidth);
  });

  it('caps_at_60_intervals_even_for_very_long_offline', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('dataVault', 8, 8)],
    };

    const longElapsed = PASSIVE_INCOME_INTERVAL_MS * 200;
    const resources = calculateOfflineResources(grid, longElapsed);

    const cappedResources = calculateOfflineResources(grid, PASSIVE_INCOME_INTERVAL_MS * 60);
    expect(resources).toEqual(cappedResources);
  });

  it('partial_interval_not_counted', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('dataVault', 8, 8)],
    };

    const partialElapsed = PASSIVE_INCOME_INTERVAL_MS * 2.5;
    const resources = calculateOfflineResources(grid, partialElapsed);

    const twoIntervals = calculateOfflineResources(grid, PASSIVE_INCOME_INTERVAL_MS * 2);
    expect(resources).toEqual(twoIntervals);
  });
});

describe('economy — capResources', () => {
  it('caps_resources_at_10x_daily_cap', () => {
    const excessive = {
      compute: DAILY_RESOURCE_CAP.compute * 100,
      memory: DAILY_RESOURCE_CAP.memory * 100,
      bandwidth: DAILY_RESOURCE_CAP.bandwidth * 100,
    };
    const capped = capResources(excessive);
    expect(capped.compute).toBe(DAILY_RESOURCE_CAP.compute * 10);
    expect(capped.memory).toBe(DAILY_RESOURCE_CAP.memory * 10);
    expect(capped.bandwidth).toBe(DAILY_RESOURCE_CAP.bandwidth * 10);
  });

  it('does_not_cap_resources_below_limit', () => {
    const normal = { compute: 50, memory: 30, bandwidth: 10 };
    const capped = capResources(normal);
    expect(capped).toEqual(normal);
  });
});
