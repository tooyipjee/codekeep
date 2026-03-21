import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Tutorial } from '../src/components/Tutorial.js';
import type { GameSave } from '@codekeep/shared';
import { STARTING_RESOURCES } from '@codekeep/shared';

function makeGameSave(): GameSave {
  return {
    schemaVersion: 1,
    savedAtUnixMs: Date.now(),
    player: { id: 'p1', displayName: 'Tester', settings: { asciiMode: false } },
    keep: {
      id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
      grid: { width: 16, height: 16, structures: [] },
      resources: { ...STARTING_RESOURCES },
      createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
    },
    raidHistory: [],
    tutorialCompleted: false,
    lastPlayedAtUnixMs: Date.now(),
    progression: {
      totalBuildsToday: 0, totalCommitsToday: 0, lastDailyResetDay: 0,
      totalRaidsWon: 0, totalRaidsLost: 0, totalStructuresPlaced: 0,
      currentWinStreak: 0, bestWinStreak: 0, achievements: [],
      totalRaidersKilledByArcher: 0,
    },
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Tutorial component', () => {
  it('renders welcome step initially', async () => {
    const { lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(50);
    const frame = lastFrame();
    expect(frame).toContain('Welcome');
    expect(frame).toContain('CodeKeep');
  });

  it('shows progress indicator', async () => {
    const { lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(50);
    expect(lastFrame()).toContain('[0/12]');
  });

  it('advances to next step on Enter', async () => {
    const { stdin, lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(50);
    stdin.write('\r');
    await delay(50);
    expect(lastFrame()).toContain('[1/12]');
  });

  it('skips tutorial with s key', async () => {
    const onComplete = vi.fn();
    const { stdin } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={onComplete} />,
    );
    await delay(50);
    stdin.write('s');
    await delay(50);
    expect(onComplete).toHaveBeenCalled();
  });

  it('resource explanation step shows resource types', async () => {
    const { stdin, lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(50);
    stdin.write('\r');
    await delay(50);
    const frame = lastFrame();
    expect(frame).toContain('Gold');
    expect(frame).toContain('Wood');
    expect(frame).toContain('Stone');
  });

  it('move step requires 4 moves before advancing', async () => {
    const { stdin, lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(50);
    stdin.write('\r');
    await delay(50);
    stdin.write('\r');
    await delay(50);
    const frame = lastFrame();
    expect(frame).toContain('Movement');
    expect(frame).toContain('move at least 4');
  });

  it('move step advances after 4 moves', async () => {
    const { stdin, lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(80);
    stdin.write('\r');
    await delay(80);
    stdin.write('\r');
    await delay(80);
    stdin.write('h'); await delay(150);
    stdin.write('j'); await delay(150);
    stdin.write('k'); await delay(150);
    stdin.write('l'); await delay(200);
    expect(lastFrame()).toContain('Great!');
    stdin.write('\r');
    await delay(80);
    expect(lastFrame()).toContain('Stone Wall');
  });

  it('place_wall step shows grid and accepts placement', async () => {
    const { stdin, lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={vi.fn()} />,
    );
    await delay(80);
    stdin.write('\r');
    await delay(80);
    stdin.write('\r');
    await delay(80);
    // move step - 4 moves
    stdin.write('h'); await delay(50);
    stdin.write('h'); await delay(50);
    stdin.write('h'); await delay(50);
    stdin.write('h'); await delay(80);
    stdin.write('\r');
    await delay(80);
    expect(lastFrame()).toContain('Stone Wall');
    stdin.write('e');
    await delay(100);
    const frame = lastFrame();
    expect(frame).toContain('Treasury');
  });

  it('full walkthrough places all structures and simulates raid', async () => {
    const onComplete = vi.fn();
    const { stdin, lastFrame } = render(
      <Tutorial gameSave={makeGameSave()} onComplete={onComplete} />,
    );
    await delay(200);

    // welcome → resources
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('Gold');

    // resources → move
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('Movement');

    // move: 4 moves with generous delays
    stdin.write('h'); await delay(150);
    stdin.write('h'); await delay(150);
    stdin.write('h'); await delay(150);
    stdin.write('h'); await delay(200);
    expect(lastFrame()).toContain('Great!');

    // move → place_wall
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('Stone Wall');

    // place wall at cursor pos
    stdin.write('e');
    await delay(200);
    expect(lastFrame()).toContain('Treasury');

    // move right and place treasury
    stdin.write('l'); await delay(150);
    stdin.write('e');
    await delay(200);
    expect(lastFrame()).toContain('Archer Tower');

    // move right and place archer
    stdin.write('l'); await delay(150);
    stdin.write('e');
    await delay(200);
    expect(lastFrame()).toContain('Bear Trap');

    // move right and place trap
    stdin.write('l'); await delay(150);
    stdin.write('e');
    await delay(200);
    expect(lastFrame()).toContain('Upgrading');

    // upgrade_explain → first_raid
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('First Raid');

    // first_raid → simulate
    stdin.write('\r');
    await delay(300);
    expect(lastFrame()).toMatch(/Victory|raiders got through/);

    // raid_result → foraging
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('Foraging');

    // foraging → tips
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('Pro Tips');

    // tips → done
    stdin.write('\r');
    await delay(200);
    expect(lastFrame()).toContain('ready to defend');

    // done → complete
    stdin.write('\r');
    await delay(80);
    expect(onComplete).toHaveBeenCalled();
  });
});
