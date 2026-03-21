import { describe, it, expect } from 'vitest';
import { simulateRaid, type RaidConfig } from '../src/engine/raid-sim.js';
import type { KeepGridState, PlacedStructure, StructureKind, RaidOutcome } from '@codekeep/shared';
import { ALL_STRUCTURE_KINDS } from '@codekeep/shared';
import { generateNpcKeep } from '../src/npc/generator.js';

function makeStructure(
  kind: StructureKind,
  x: number,
  y: number,
  level: PlacedStructure['level'] = 1,
  id?: string,
): PlacedStructure {
  return {
    id: id ?? `${kind}-${x}-${y}`,
    kind,
    level,
    pos: { x, y },
    placedAtUnixMs: 0,
  };
}

function createBalancedKeep(): KeepGridState {
  const structures: PlacedStructure[] = [
    // Data vault in the center
    makeStructure('dataVault', 8, 8, 1),

    // Firewalls on north and west sides only — south and east are open
    makeStructure('firewall', 7, 7, 1),
    makeStructure('firewall', 8, 7, 1),
    makeStructure('firewall', 9, 7, 1),
    makeStructure('firewall', 7, 8, 1),
    makeStructure('firewall', 7, 9, 1),

    // Honeypots on southern approach paths
    makeStructure('honeypot', 8, 10, 1),
    makeStructure('honeypot', 10, 8, 1),
    makeStructure('honeypot', 6, 6, 1),

    // Encryption node adjacent to vault
    makeStructure('encryptionNode', 9, 8, 1),
    makeStructure('encryptionNode', 8, 9, 1),

    // Relay towers
    makeStructure('relayTower', 10, 9, 1),
    makeStructure('relayTower', 9, 9, 1),

    // Scanner covering the southern approach
    makeStructure('scanner', 8, 11, 1),
  ];

  return { width: 16, height: 16, structures };
}

function getOutcome(replay: ReturnType<typeof simulateRaid>): RaidOutcome {
  const endEvent = replay.events.find((e) => e.type === 'raid_end');
  if (!endEvent || endEvent.type !== 'raid_end') throw new Error('No raid_end event found');
  return endEvent.outcome;
}

describe('balance — structure diversity', () => {
  it('balanced_layout_uses_all_6_structure_types_without_any_exceeding_70_percent', () => {
    const grid = createBalancedKeep();
    const counts = new Map<StructureKind, number>();

    for (const kind of ALL_STRUCTURE_KINDS) {
      counts.set(kind, 0);
    }
    for (const s of grid.structures) {
      counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
    }

    const total = grid.structures.length;
    expect(total).toBeGreaterThanOrEqual(10);

    for (const kind of ALL_STRUCTURE_KINDS) {
      const count = counts.get(kind) ?? 0;
      expect(count, `structure kind "${kind}" should be present`).toBeGreaterThan(0);

      const ratio = count / total;
      expect(
        ratio,
        `structure kind "${kind}" is ${(ratio * 100).toFixed(1)}% of layout (${count}/${total}), exceeds 70% cap`,
      ).toBeLessThanOrEqual(0.7);
    }
  });
});

describe('balance — raid outcome diversity', () => {
  it('20_raids_across_varied_layouts_produce_mixed_outcomes', () => {
    const outcomes: RaidOutcome[] = [];

    // Reachable vaults — expected to be breached
    for (let i = 0; i < 17; i++) {
      const npcKeep = generateNpcKeep(`diversity-npc-${i}`, 1 + (i % 5));
      const replay = simulateRaid({
        probeCount: 4 + (i % 3),
        keepGrid: npcKeep.grid,
        seed: `npc-raid-${i}`,
      });
      outcomes.push(getOutcome(replay));
    }

    // Enclosed vault — probes can't reach, defense wins
    const enclosedGrid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8, 1),
        makeStructure('firewall', 7, 7, 2),
        makeStructure('firewall', 8, 7, 2),
        makeStructure('firewall', 9, 7, 2),
        makeStructure('firewall', 7, 8, 2),
        makeStructure('firewall', 9, 8, 2),
        makeStructure('firewall', 7, 9, 2),
        makeStructure('firewall', 8, 9, 2),
        makeStructure('firewall', 9, 9, 2),
      ],
    };
    for (let i = 0; i < 3; i++) {
      const replay = simulateRaid({
        probeCount: 2,
        keepGrid: enclosedGrid,
        seed: `enclosed-raid-${i}`,
      });
      outcomes.push(getOutcome(replay));
    }

    expect(outcomes).toHaveLength(20);
    for (const o of outcomes) {
      expect(['defense_win', 'partial_breach', 'full_breach']).toContain(o);
    }

    const uniqueOutcomes = new Set(outcomes);
    expect(
      uniqueOutcomes.size,
      `Expected mixed outcomes across 20 raids but got only: ${[...uniqueOutcomes].join(', ')}`,
    ).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it('different_layouts_produce_different_outcomes', () => {
    // Fortress: vault enclosed by double ring of level 3 firewalls — unreachable
    const fortressGrid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 8, 8, 1),
        ...[
          [7, 7], [8, 7], [9, 7],
          [7, 8], [9, 8],
          [7, 9], [8, 9], [9, 9],
        ].map(([x, y]) => makeStructure('firewall', x, y, 3, `fw-inner-${x}-${y}`)),
        ...[
          [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
          [6, 7], [10, 7],
          [6, 8], [10, 8],
          [6, 9], [10, 9],
          [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
        ].map(([x, y]) => makeStructure('firewall', x, y, 3, `fw-outer-${x}-${y}`)),
      ],
    };

    // Open: vault right on the edge with no defenses
    const openGrid: KeepGridState = {
      width: 16,
      height: 16,
      structures: [
        makeStructure('dataVault', 0, 0, 1),
      ],
    };

    const seed = 'layout-compare-42';
    const probeCount = 4;

    const fortressOutcome = getOutcome(
      simulateRaid({ probeCount, keepGrid: fortressGrid, seed }),
    );
    const openOutcome = getOutcome(
      simulateRaid({ probeCount, keepGrid: openGrid, seed }),
    );

    expect(fortressOutcome).toBe('defense_win');
    expect(openOutcome).toBe('full_breach');
  });
});

describe('balance — NPC generation diversity', () => {
  it('generated_npc_keeps_have_varied_structure_distributions', () => {
    const kindCounts = new Map<StructureKind, number>();
    for (const kind of ALL_STRUCTURE_KINDS) {
      kindCounts.set(kind, 0);
    }

    for (let i = 0; i < 20; i++) {
      const keep = generateNpcKeep(`npc-balance-${i}`, 3);
      for (const s of keep.grid.structures) {
        kindCounts.set(s.kind, (kindCounts.get(s.kind) ?? 0) + 1);
      }
    }

    const totalStructures = [...kindCounts.values()].reduce((a, b) => a + b, 0);
    for (const kind of ALL_STRUCTURE_KINDS) {
      const count = kindCounts.get(kind) ?? 0;
      const ratio = count / totalStructures;
      expect(
        ratio,
        `Across 20 NPC keeps, "${kind}" is ${(ratio * 100).toFixed(1)}% of all structures — exceeds 70% cap`,
      ).toBeLessThanOrEqual(0.7);
    }
  });
});
