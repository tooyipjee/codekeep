import { describe, it, expect } from 'vitest';
import { spawnFragments, collectFragment, decayFragments } from '../src/engine/fragments.js';
import type { KeepGridState, PlacedStructure, DataFragment } from '@codekeep/shared';
import {
  FRAGMENT_MAX,
  FRAGMENT_DECAY_MS,
  FRAGMENT_TYPES,
  FRAGMENT_VAULT_BONUS,
  GRID_SIZE,
} from '@codekeep/shared';

function makeStructure(
  kind: PlacedStructure['kind'],
  x: number,
  y: number,
  level: PlacedStructure['level'] = 1,
  id?: string,
): PlacedStructure {
  return { id: id ?? `${kind}-${x}-${y}`, kind, level, pos: { x, y }, placedAtUnixMs: 0 };
}

function emptyGrid(): KeepGridState {
  return { width: 16, height: 16, structures: [] };
}

function makeFragment(
  type: DataFragment['type'],
  x: number,
  y: number,
  spawnedAtMs = 1000,
): DataFragment {
  return { id: `frag-${x}-${y}`, type, pos: { x, y }, spawnedAtMs };
}

function deterministicRng(seed = 42): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('fragments — spawnFragments', () => {
  it('spawns_fragments_on_empty_grid', () => {
    const result = spawnFragments([], emptyGrid(), Date.now(), deterministicRng());
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(FRAGMENT_MAX);
  });

  it('does_not_exceed_fragment_max', () => {
    const existing: DataFragment[] = [];
    for (let i = 0; i < FRAGMENT_MAX; i++) {
      existing.push(makeFragment('compute_shard', i, 0));
    }
    const result = spawnFragments(existing, emptyGrid(), Date.now(), deterministicRng());
    expect(result.length).toBe(FRAGMENT_MAX);
  });

  it('does_not_place_on_occupied_cells', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: Array.from({ length: 16 }, (_, x) =>
        Array.from({ length: 16 }, (_, y) =>
          makeStructure('firewall', x, y, 1, `fw-${x}-${y}`),
        ),
      ).flat(),
    };
    const result = spawnFragments([], grid, Date.now(), deterministicRng());
    expect(result.length).toBe(0);
  });

  it('does_not_place_on_existing_fragment_cells', () => {
    const existing = [makeFragment('compute_shard', 0, 0)];
    const result = spawnFragments(existing, emptyGrid(), Date.now(), deterministicRng());
    for (const f of result) {
      const dupes = result.filter((o) => o.pos.x === f.pos.x && o.pos.y === f.pos.y);
      expect(dupes.length, `duplicate fragment at ${f.pos.x},${f.pos.y}`).toBe(1);
    }
  });

  it('scanner_boost_increases_spawn_count', () => {
    const gridNoScanner = emptyGrid();
    const gridWithScanners: KeepGridState = {
      width: 16, height: 16,
      structures: [
        makeStructure('scanner', 4, 4, 1),
        makeStructure('scanner', 8, 8, 1),
        makeStructure('scanner', 12, 12, 1),
      ],
    };

    let totalWithout = 0;
    let totalWith = 0;
    for (let i = 0; i < 50; i++) {
      totalWithout += spawnFragments([], gridNoScanner, Date.now() + i, deterministicRng(i)).length;
      totalWith += spawnFragments([], gridWithScanners, Date.now() + i, deterministicRng(i)).length;
    }

    expect(totalWith).toBeGreaterThan(totalWithout);
  });

  it('scanner_boost_capped_at_plus_2', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: Array.from({ length: 10 }, (_, i) =>
        makeStructure('scanner', i, 0, 1, `sc-${i}`),
      ),
    };

    const results: number[] = [];
    for (let i = 0; i < 20; i++) {
      const frags = spawnFragments([], grid, Date.now() + i, deterministicRng(i));
      results.push(frags.length);
    }

    // base is 1-2 + bonus capped at 2 = max 4 per spawn
    for (const count of results) {
      expect(count).toBeLessThanOrEqual(4);
    }
  });

  it('spawned_fragments_have_valid_types', () => {
    const result = spawnFragments([], emptyGrid(), Date.now(), deterministicRng());
    const validTypes = Object.keys(FRAGMENT_TYPES);
    for (const f of result) {
      expect(validTypes).toContain(f.type);
    }
  });

  it('spawned_fragments_within_grid_bounds', () => {
    const result = spawnFragments([], emptyGrid(), Date.now(), deterministicRng());
    for (const f of result) {
      expect(f.pos.x).toBeGreaterThanOrEqual(0);
      expect(f.pos.x).toBeLessThan(GRID_SIZE);
      expect(f.pos.y).toBeGreaterThanOrEqual(0);
      expect(f.pos.y).toBeLessThan(GRID_SIZE);
    }
  });

  it('is_deterministic_with_same_rng_seed', () => {
    const a = spawnFragments([], emptyGrid(), 1000, deterministicRng(99));
    const b = spawnFragments([], emptyGrid(), 1000, deterministicRng(99));
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].type).toBe(b[i].type);
      expect(a[i].pos).toEqual(b[i].pos);
    }
  });
});

describe('fragments — collectFragment', () => {
  it('collects_fragment_at_position', () => {
    const fragments = [makeFragment('compute_shard', 5, 5)];
    const result = collectFragment(fragments, { x: 5, y: 5 }, emptyGrid());

    expect(result).not.toBeNull();
    expect(result!.collected).toHaveLength(1);
    expect(result!.updatedFragments).toHaveLength(0);
    expect(result!.yield.compute).toBe(FRAGMENT_TYPES.compute_shard.yield.compute);
  });

  it('returns_null_when_no_fragment_at_position', () => {
    const fragments = [makeFragment('compute_shard', 5, 5)];
    const result = collectFragment(fragments, { x: 10, y: 10 }, emptyGrid());
    expect(result).toBeNull();
  });

  it('returns_correct_yield_for_each_type', () => {
    for (const [type, def] of Object.entries(FRAGMENT_TYPES)) {
      const fragments = [makeFragment(type as DataFragment['type'], 8, 8)];
      const result = collectFragment(fragments, { x: 8, y: 8 }, emptyGrid());
      expect(result).not.toBeNull();
      expect(result!.yield.compute).toBe(def.yield.compute);
      expect(result!.yield.memory).toBe(def.yield.memory);
      expect(result!.yield.bandwidth).toBe(def.yield.bandwidth);
    }
  });

  it('vault_proximity_gives_bonus_yield', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [makeStructure('dataVault', 5, 5)],
    };
    const fragments = [makeFragment('compute_shard', 5, 6)]; // Manhattan 1 from vault

    const result = collectFragment(fragments, { x: 5, y: 6 }, grid);
    expect(result).not.toBeNull();

    const baseYield = FRAGMENT_TYPES.compute_shard.yield.compute;
    const expectedYield = Math.ceil(baseYield * (1 + FRAGMENT_VAULT_BONUS));
    expect(result!.yield.compute).toBe(expectedYield);
  });

  it('no_vault_bonus_when_vault_too_far', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [makeStructure('dataVault', 0, 0)],
    };
    const fragments = [makeFragment('compute_shard', 10, 10)]; // Far from vault

    const result = collectFragment(fragments, { x: 10, y: 10 }, grid);
    expect(result).not.toBeNull();
    expect(result!.yield.compute).toBe(FRAGMENT_TYPES.compute_shard.yield.compute);
  });

  it('relay_auto_collects_adjacent_fragments', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [makeStructure('relayTower', 5, 5, 2)], // L2 relay: range 2
    };
    const fragments = [
      makeFragment('compute_shard', 5, 5, 1000),   // at relay (and collection point)
      makeFragment('memory_bit', 5, 6, 1000),       // Manhattan 1 from collect pos
      makeFragment('bandwidth_packet', 6, 6, 1000), // Manhattan 2 from collect pos
      makeFragment('data_bundle', 10, 10, 1000),    // Far away, should NOT be collected
    ];

    const result = collectFragment(fragments, { x: 5, y: 5 }, grid);
    expect(result).not.toBeNull();
    expect(result!.collected.length).toBe(3); // the one at pos + 2 nearby
    expect(result!.updatedFragments.length).toBe(1); // only the far one remains
    expect(result!.updatedFragments[0].type).toBe('data_bundle');
  });

  it('relay_range_scales_with_level', () => {
    const grid1: KeepGridState = {
      width: 16, height: 16,
      structures: [makeStructure('relayTower', 5, 5, 1)], // L1 range: 1
    };
    const grid3: KeepGridState = {
      width: 16, height: 16,
      structures: [makeStructure('relayTower', 5, 5, 3)], // L3 range: 3
    };
    const fragments = [
      makeFragment('compute_shard', 5, 5, 1000),
      makeFragment('memory_bit', 5, 8, 1000), // Manhattan 3 from collect point
    ];

    const result1 = collectFragment([...fragments], { x: 5, y: 5 }, grid1);
    const result3 = collectFragment([...fragments], { x: 5, y: 5 }, grid3);

    expect(result1!.collected.length).toBe(1); // only direct, 5,8 is out of L1 range
    expect(result3!.collected.length).toBe(2); // both, 5,8 is within L3 range
  });

  it('leaves_other_fragments_intact', () => {
    const fragments = [
      makeFragment('compute_shard', 3, 3),
      makeFragment('memory_bit', 7, 7),
      makeFragment('bandwidth_packet', 10, 10),
    ];

    const result = collectFragment(fragments, { x: 7, y: 7 }, emptyGrid());
    expect(result).not.toBeNull();
    expect(result!.updatedFragments).toHaveLength(2);
    expect(result!.updatedFragments.map((f) => f.type)).toEqual(['compute_shard', 'bandwidth_packet']);
  });
});

describe('fragments — decayFragments', () => {
  it('removes_fragments_older_than_decay_threshold', () => {
    const now = 200_000;
    const fragments = [
      makeFragment('compute_shard', 1, 1, now - FRAGMENT_DECAY_MS - 1),   // expired
      makeFragment('memory_bit', 2, 2, now - FRAGMENT_DECAY_MS + 1000),   // still fresh
      makeFragment('bandwidth_packet', 3, 3, now - 1000),                  // very fresh
    ];

    const result = decayFragments(fragments, now);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('memory_bit');
    expect(result[1].type).toBe('bandwidth_packet');
  });

  it('keeps_all_fragments_when_none_expired', () => {
    const now = 10_000;
    const fragments = [
      makeFragment('compute_shard', 1, 1, now - 1000),
      makeFragment('memory_bit', 2, 2, now - 2000),
    ];

    const result = decayFragments(fragments, now);
    expect(result).toHaveLength(2);
  });

  it('returns_empty_when_all_expired', () => {
    const now = 1_000_000;
    const fragments = [
      makeFragment('compute_shard', 1, 1, 0),
      makeFragment('memory_bit', 2, 2, 100),
    ];

    const result = decayFragments(fragments, now);
    expect(result).toHaveLength(0);
  });

  it('handles_empty_array', () => {
    expect(decayFragments([], Date.now())).toHaveLength(0);
  });
});

describe('fragments — type weights', () => {
  it('weighted_distribution_is_roughly_correct', () => {
    const rng = deterministicRng(123);
    const counts: Record<string, number> = {};

    for (let i = 0; i < 500; i++) {
      const frags = spawnFragments([], emptyGrid(), Date.now() + i * 1000, rng);
      for (const f of frags) {
        counts[f.type] = (counts[f.type] ?? 0) + 1;
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(100);

    // data_bundle (10% weight) should be the least common
    const bundleRatio = (counts['data_bundle'] ?? 0) / total;
    const shardRatio = (counts['compute_shard'] ?? 0) / total;
    expect(bundleRatio).toBeLessThan(shardRatio);
  });
});
