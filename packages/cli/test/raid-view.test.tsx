import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { RaidView } from '../src/components/RaidView.js';
import type { RaidReplay, KeepGridState, RaidTickEvent } from '@codekeep/shared';

function makeReplay(events: RaidTickEvent[], maxTicks = 50): RaidReplay {
  return { tickRateHz: 8, maxTicks, events };
}

const emptyGrid: KeepGridState = { width: 16, height: 16, structures: [] };

const gridWithStructures: KeepGridState = {
  width: 16, height: 16,
  structures: [
    { id: 'w1', kind: 'wall', level: 1, pos: { x: 5, y: 5 }, placedAtUnixMs: Date.now() },
    { id: 't1', kind: 'treasury', level: 1, pos: { x: 8, y: 8 }, placedAtUnixMs: Date.now() },
    { id: 'a1', kind: 'archerTower', level: 1, pos: { x: 7, y: 7 }, placedAtUnixMs: Date.now() },
  ],
};

const spawnEvents: RaidTickEvent[] = [
  { t: 0, type: 'raider_spawn', probeId: 0, edge: 'N', pos: { x: 3, y: 0 }, raiderType: 'raider', maxHp: 30 },
  { t: 0, type: 'raider_spawn', probeId: 1, edge: 'S', pos: { x: 10, y: 15 }, raiderType: 'scout', maxHp: 14 },
  { t: 0, type: 'raider_spawn', probeId: 2, edge: 'W', pos: { x: 0, y: 7 }, raiderType: 'brute', maxHp: 55 },
];

const fullReplay: RaidTickEvent[] = [
  ...spawnEvents,
  { t: 1, type: 'raider_move', probeId: 0, from: { x: 3, y: 0 }, to: { x: 3, y: 1 } },
  { t: 2, type: 'raider_stunned', probeId: 0, pos: { x: 3, y: 1 }, trapId: 'trap1', stunTicks: 4 },
  { t: 3, type: 'arrow_hit', probeId: 0, archerId: 'a1', damage: 4, hpRemaining: 26 },
  { t: 4, type: 'wall_damaged', structureId: 'w1', hpRemaining: 32, destroyed: false },
  { t: 5, type: 'wall_damaged', structureId: 'w1', hpRemaining: 0, destroyed: true },
  { t: 6, type: 'arrow_hit', probeId: 1, archerId: 'a1', damage: 14, hpRemaining: 0 },
  { t: 6, type: 'raider_destroyed', probeId: 1, pos: { x: 10, y: 14 } },
  { t: 8, type: 'treasury_breach', structureId: 't1', lootTaken: { gold: 10, wood: 8, stone: 5 } },
  { t: 10, type: 'raider_destroyed', probeId: 0, pos: { x: 5, y: 5 } },
  { t: 15, type: 'raider_destroyed', probeId: 2, pos: { x: 8, y: 8 } },
  { t: 15, type: 'raid_end', outcome: 'partial_breach' },
];

describe('RaidView component', () => {
  it('renders defending header', () => {
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    expect(lastFrame()).toContain('DEFENDING YOUR KEEP');
  });

  it('renders attacking header', () => {
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="attack" onDone={vi.fn()} />,
    );
    expect(lastFrame()).toContain('ATTACKING NPC KEEP');
  });

  it('renders hex grid coordinates', () => {
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('0');
    expect(frame).toContain('F');
  });

  it('shows speed controls in legend', () => {
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    expect(lastFrame()).toContain('1/2/4/8 speed');
  });

  it('shows raider type legend', () => {
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('R');
    expect(frame).toContain('Raider');
    expect(frame).toContain('Scout');
    expect(frame).toContain('Brute');
    expect(frame).toContain('Spawn');
  });

  it('shows structures on the grid', () => {
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={gridWithStructures} raidType="defend" onDone={vi.fn()} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('#');
    expect(frame).toContain('$');
  });

  it('renders tick counter', () => {
    const replay = makeReplay(spawnEvents, 100);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    expect(lastFrame()).toContain('Tick: 0/100');
  });

  it('calls onDone when q is pressed', () => {
    const onDone = vi.fn();
    const replay = makeReplay(spawnEvents);
    const { stdin } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={onDone} />,
    );
    stdin.write('q');
    expect(onDone).toHaveBeenCalled();
  });

  it('skips to end when n is pressed', async () => {
    const replay = makeReplay(fullReplay, 15);
    const { stdin, lastFrame } = render(
      <RaidView replay={replay} keepGrid={gridWithStructures} raidType="defend" onDone={vi.fn()} />,
    );
    await new Promise((r) => setTimeout(r, 100));
    stdin.write('n');
    await new Promise((r) => setTimeout(r, 800));
    expect(lastFrame()).toContain('15/15');
  });

  it('shows virtual treasury when no treasuries on grid', () => {
    const noTreasuryGrid: KeepGridState = {
      width: 16, height: 16,
      structures: [
        { id: 'w1', kind: 'wall', level: 1, pos: { x: 5, y: 5 }, placedAtUnixMs: Date.now() },
      ],
    };
    const replay = makeReplay(spawnEvents);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={noTreasuryGrid} raidType="defend" onDone={vi.fn()} />,
    );
    expect(lastFrame()).toContain('$');
  });

  it('renders with summary prop when provided', async () => {
    const replay = makeReplay(fullReplay, 15);
    const summary = {
      won: false, raidType: 'defend' as const, outcome: 'partial_breach',
      lootGained: { gold: 0, wood: 0, stone: 0 },
      lootLost: { gold: 10, wood: 8, stone: 5 },
      raidersKilled: 3, raidersTotal: 3, wallsDestroyed: 1, archersActive: 1, difficulty: 1,
    };
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={gridWithStructures} raidType="defend"
                summary={summary} onDone={vi.fn()} />,
    );
    await new Promise((r) => setTimeout(r, 100));
    const frame = lastFrame();
    expect(frame).toContain('DEFENDING YOUR KEEP');
    expect(frame).toContain('Tick:');
  });

  it('toggles pause with p key', async () => {
    const replay = makeReplay(spawnEvents, 100);
    const { stdin, lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    await new Promise((r) => setTimeout(r, 300));
    stdin.write('p');
    await new Promise((r) => setTimeout(r, 300));
    const frame = lastFrame();
    expect(frame).toContain('PAUSED');
  });

  it('changes speed with number keys', async () => {
    const onSpeedChange = vi.fn();
    const replay = makeReplay(spawnEvents, 100);
    const { stdin, lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend"
                onDone={vi.fn()} onSpeedChange={onSpeedChange} />,
    );
    await new Promise((r) => setTimeout(r, 200));
    stdin.write('4');
    await new Promise((r) => setTimeout(r, 200));
    expect(lastFrame()).toContain('Speed: 4x');
    expect(onSpeedChange).toHaveBeenCalledWith(4);
  });

  it('default speed is 1x', () => {
    const replay = makeReplay(spawnEvents, 100);
    const { lastFrame } = render(
      <RaidView replay={replay} keepGrid={emptyGrid} raidType="defend" onDone={vi.fn()} />,
    );
    expect(lastFrame()).toContain('Speed: 1x');
  });
});
