import { describe, it, expect } from 'vitest';
import { calculateOfflineResources, capResources } from '../src/engine/economy.js';
import type { KeepGridState, PlacedStructure } from '@codekeep/shared';
import {
  PASSIVE_INCOME_INTERVAL_MS,
  PASSIVE_INCOME_PER_TREASURY,
  PASSIVE_INCOME_PER_WATCHTOWER,
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
      structures: [makeStructure('treasury', 8, 8)],
    };

    const resources = calculateOfflineResources(grid, 0);
    expect(resources.gold).toBe(0);
    expect(resources.wood).toBe(0);
    expect(resources.stone).toBe(0);
  });

  it('returns_zero_when_no_treasuries_or_watchtowers', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('wall', 4, 4),
        makeStructure('trap', 6, 6),
        makeStructure('archerTower', 8, 8),
      ],
    };

    const resources = calculateOfflineResources(grid, PASSIVE_INCOME_INTERVAL_MS * 10);
    expect(resources.gold).toBe(0);
    expect(resources.wood).toBe(0);
    expect(resources.stone).toBe(0);
  });

  it('calculates_income_from_treasuries', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 5, 5),
        makeStructure('treasury', 10, 10),
      ],
    };

    const intervals = 5;
    const elapsed = PASSIVE_INCOME_INTERVAL_MS * intervals;
    const resources = calculateOfflineResources(grid, elapsed);

    expect(resources.gold).toBe(intervals * 2 * PASSIVE_INCOME_PER_TREASURY.gold);
    expect(resources.wood).toBe(intervals * 2 * PASSIVE_INCOME_PER_TREASURY.wood);
    expect(resources.stone).toBe(intervals * 2 * PASSIVE_INCOME_PER_TREASURY.stone);
  });

  it('calculates_income_from_watchtowers', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('watchtower', 5, 5),
        makeStructure('watchtower', 10, 10),
        makeStructure('watchtower', 3, 3),
      ],
    };

    const intervals = 3;
    const elapsed = PASSIVE_INCOME_INTERVAL_MS * intervals;
    const resources = calculateOfflineResources(grid, elapsed);

    expect(resources.gold).toBe(intervals * 3 * PASSIVE_INCOME_PER_WATCHTOWER.gold);
    expect(resources.wood).toBe(intervals * 3 * PASSIVE_INCOME_PER_WATCHTOWER.wood);
    expect(resources.stone).toBe(intervals * 3 * PASSIVE_INCOME_PER_WATCHTOWER.stone);
  });

  it('combines_treasury_and_watchtower_income', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('treasury', 5, 5),
        makeStructure('watchtower', 10, 10),
      ],
    };

    const intervals = 4;
    const elapsed = PASSIVE_INCOME_INTERVAL_MS * intervals;
    const resources = calculateOfflineResources(grid, elapsed);

    const expectedCompute = intervals * (PASSIVE_INCOME_PER_TREASURY.gold + PASSIVE_INCOME_PER_WATCHTOWER.gold);
    const expectedMemory = intervals * (PASSIVE_INCOME_PER_TREASURY.wood + PASSIVE_INCOME_PER_WATCHTOWER.wood);
    const expectedBandwidth = intervals * (PASSIVE_INCOME_PER_TREASURY.stone + PASSIVE_INCOME_PER_WATCHTOWER.stone);

    expect(resources.gold).toBe(expectedCompute);
    expect(resources.wood).toBe(expectedMemory);
    expect(resources.stone).toBe(expectedBandwidth);
  });

  it('caps_at_60_intervals_even_for_very_long_offline', () => {
    const grid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [makeStructure('treasury', 8, 8)],
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
      structures: [makeStructure('treasury', 8, 8)],
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
      gold: DAILY_RESOURCE_CAP.gold * 100,
      wood: DAILY_RESOURCE_CAP.wood * 100,
      stone: DAILY_RESOURCE_CAP.stone * 100,
    };
    const capped = capResources(excessive);
    expect(capped.gold).toBe(DAILY_RESOURCE_CAP.gold * 10);
    expect(capped.wood).toBe(DAILY_RESOURCE_CAP.wood * 10);
    expect(capped.stone).toBe(DAILY_RESOURCE_CAP.stone * 10);
  });

  it('does_not_cap_resources_below_limit', () => {
    const normal = { gold: 50, wood: 30, stone: 10 };
    const capped = capResources(normal);
    expect(capped).toEqual(normal);
  });
});
