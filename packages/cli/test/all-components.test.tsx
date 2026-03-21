import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Help } from '../src/components/Help.js';
import { Menu } from '../src/components/Menu.js';
import { Settings } from '../src/components/Settings.js';
import { RaidLog } from '../src/components/RaidLog.js';
import { FriendList } from '../src/components/FriendList.js';
import { KeepGrid } from '../src/components/KeepGrid.js';
import type { GameSave, KeepGridState, RaidRecord, PlacedStructure } from '@codekeep/shared';
import { STARTING_RESOURCES } from '@codekeep/shared';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeGameSave(overrides?: Partial<GameSave>): GameSave {
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
    tutorialCompleted: true,
    lastPlayedAtUnixMs: Date.now(),
    progression: {
      totalBuildsToday: 0, totalCommitsToday: 0, lastDailyResetDay: 0,
      totalRaidsWon: 3, totalRaidsLost: 1,
      totalStructuresPlaced: 5,
      currentWinStreak: 2, bestWinStreak: 3,
      achievements: ['first_structure'], totalRaidersKilledByArcher: 5,
    },
    ...overrides,
  };
}

function makeRaidRecord(isDefense: boolean): RaidRecord {
  return {
    id: 'raid-1', seed: 'test-seed', rulesVersion: 1,
    attackerId: isDefense ? 'npc' : 'p1',
    defenderKeepId: isDefense ? 'k1' : 'npc-keep',
    startedAtUnixMs: Date.now() - 60000, resolvedAtUnixMs: Date.now() - 30000,
    outcome: 'defense_win',
    lootLost: { gold: 0, wood: 0, stone: 0 },
    lootGained: { gold: 13, wood: 7, stone: 7 },
    replay: { tickRateHz: 8, maxTicks: 100, events: [] },
  };
}

describe('Help component', () => {
  it('renders all help sections', () => {
    const { lastFrame } = render(<Help />);
    const frame = lastFrame();
    expect(frame).toContain('Navigation');
    expect(frame).toContain('Building');
    expect(frame).toContain('Foraging');
    expect(frame).toContain('Combat');
    expect(frame).toContain('Structures');
    expect(frame).toContain('Resources');
    expect(frame).toContain('Raider Types');
    expect(frame).toContain('Raid Difficulty');
  });

  it('shows all structure names and costs', () => {
    const { lastFrame } = render(<Help />);
    const frame = lastFrame();
    expect(frame).toContain('Stone Wall');
    expect(frame).toContain('Bear Trap');
    expect(frame).toContain('Treasury');
    expect(frame).toContain('Ward');
    expect(frame).toContain('Watchtower');
    expect(frame).toContain('Archer Tower');
  });

  it('shows raider stats', () => {
    const { lastFrame } = render(<Help />);
    const frame = lastFrame();
    expect(frame).toContain('Raider');
    expect(frame).toContain('Scout');
    expect(frame).toContain('Brute');
    expect(frame).toContain('30');
    expect(frame).toContain('14');
    expect(frame).toContain('55');
  });

  it('shows keyboard shortcuts', () => {
    const { lastFrame } = render(<Help />);
    const frame = lastFrame();
    expect(frame).toContain('h/j/k/l');
    expect(frame).toContain('Tab');
    expect(frame).toContain('Esc');
  });
});

describe('Menu component', () => {
  it('renders menu items', () => {
    const noop = vi.fn();
    const save = makeGameSave();
    const { lastFrame } = render(
      <Menu gameSave={save} onKeep={noop} onAttack={noop} onDefend={noop}
            onFriendRaid={noop} onRaidLog={noop} onSettings={noop} onQuit={noop} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('Build Keep');
    expect(frame).toContain('Defend Keep');
    expect(frame).toContain('Attack NPC');
    expect(frame).toContain('Raid Rival Keep');
    expect(frame).toContain('Raid Log');
    expect(frame).toContain('Settings');
    expect(frame).toContain('Rest for the Night');
  });

  it('shows player stats', () => {
    const noop = vi.fn();
    const save = makeGameSave();
    const { lastFrame } = render(
      <Menu gameSave={save} onKeep={noop} onAttack={noop} onDefend={noop}
            onFriendRaid={noop} onRaidLog={noop} onSettings={noop} onQuit={noop} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('Tester');
    expect(frame).toContain('3W');
    expect(frame).toContain('1L');
  });

  it('shows achievement count', () => {
    const noop = vi.fn();
    const save = makeGameSave();
    const { lastFrame } = render(
      <Menu gameSave={save} onKeep={noop} onAttack={noop} onDefend={noop}
            onFriendRaid={noop} onRaidLog={noop} onSettings={noop} onQuit={noop} />,
    );
    expect(lastFrame()).toContain('1/10');
  });

  it('calls onKeep when Enter is pressed on Build Keep', () => {
    const onKeep = vi.fn();
    const noop = vi.fn();
    const save = makeGameSave();
    const { stdin } = render(
      <Menu gameSave={save} onKeep={onKeep} onAttack={noop} onDefend={noop}
            onFriendRaid={noop} onRaidLog={noop} onSettings={noop} onQuit={noop} />,
    );
    stdin.write('\r');
    expect(onKeep).toHaveBeenCalled();
  });

  it('calls onQuit when q is pressed', () => {
    const onQuit = vi.fn();
    const noop = vi.fn();
    const save = makeGameSave();
    const { stdin } = render(
      <Menu gameSave={save} onKeep={noop} onAttack={noop} onDefend={noop}
            onFriendRaid={noop} onRaidLog={noop} onSettings={noop} onQuit={onQuit} />,
    );
    stdin.write('q');
    expect(onQuit).toHaveBeenCalled();
  });

  it('navigates down with j key', async () => {
    const onDefend = vi.fn();
    const noop = vi.fn();
    const save = makeGameSave();
    const { stdin } = render(
      <Menu gameSave={save} onKeep={noop} onAttack={noop} onDefend={onDefend}
            onFriendRaid={noop} onRaidLog={noop} onSettings={noop} onQuit={noop} />,
    );
    stdin.write('j');
    await delay(50);
    stdin.write('\r');
    await delay(50);
    expect(onDefend).toHaveBeenCalled();
  });
});

describe('Settings component', () => {
  it('renders settings items', () => {
    const noop = vi.fn();
    const { lastFrame } = render(
      <Settings onBack={noop} onResetGame={noop} onReplayTutorial={noop}
                asciiMode={false} onToggleAscii={noop} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('ASCII Mode: OFF');
    expect(frame).toContain('Replay Tutorial');
    expect(frame).toContain('Reset Game');
    expect(frame).toContain('Back');
  });

  it('shows ASCII ON when asciiMode is true', () => {
    const noop = vi.fn();
    const { lastFrame } = render(
      <Settings onBack={noop} onResetGame={noop} onReplayTutorial={noop}
                asciiMode={true} onToggleAscii={noop} />,
    );
    expect(lastFrame()).toContain('ASCII Mode: ON');
  });

  it('calls onBack when q is pressed', () => {
    const onBack = vi.fn();
    const noop = vi.fn();
    const { stdin } = render(
      <Settings onBack={onBack} onResetGame={noop} onReplayTutorial={noop}
                asciiMode={false} onToggleAscii={noop} />,
    );
    stdin.write('q');
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onToggleAscii when Enter on first item', () => {
    const onToggleAscii = vi.fn();
    const noop = vi.fn();
    const { stdin } = render(
      <Settings onBack={noop} onResetGame={noop} onReplayTutorial={noop}
                asciiMode={false} onToggleAscii={onToggleAscii} />,
    );
    stdin.write('\r');
    expect(onToggleAscii).toHaveBeenCalled();
  });

  it('calls onReplayTutorial when navigated and selected', async () => {
    const onReplayTutorial = vi.fn();
    const noop = vi.fn();
    const { stdin } = render(
      <Settings onBack={noop} onResetGame={noop} onReplayTutorial={onReplayTutorial}
                asciiMode={false} onToggleAscii={noop} />,
    );
    stdin.write('j');
    await delay(50);
    stdin.write('\r');
    await delay(50);
    expect(onReplayTutorial).toHaveBeenCalled();
  });

  it('shows reset confirmation prompt', async () => {
    const noop = vi.fn();
    const { stdin, lastFrame } = render(
      <Settings onBack={noop} onResetGame={noop} onReplayTutorial={noop}
                asciiMode={false} onToggleAscii={noop} />,
    );
    stdin.write('j');
    await delay(50);
    stdin.write('j');
    await delay(50);
    stdin.write('j');
    await delay(50);
    stdin.write('\r');
    await delay(50);
    expect(lastFrame()).toContain('Are you sure');
  });

  it('confirms reset with Y', async () => {
    const onResetGame = vi.fn();
    const noop = vi.fn();
    const { stdin } = render(
      <Settings onBack={noop} onResetGame={onResetGame} onReplayTutorial={noop}
                asciiMode={false} onToggleAscii={noop} />,
    );
    stdin.write('j');
    await delay(150);
    stdin.write('j');
    await delay(150);
    stdin.write('j');
    await delay(150);
    stdin.write('\r');
    await delay(150);
    stdin.write('y');
    await delay(150);
    expect(onResetGame).toHaveBeenCalled();
  });

  it('cancels reset with any other key', () => {
    const onResetGame = vi.fn();
    const noop = vi.fn();
    const { stdin, lastFrame } = render(
      <Settings onBack={noop} onResetGame={onResetGame} onReplayTutorial={noop}
                asciiMode={false} onToggleAscii={noop} />,
    );
    stdin.write('j');
    stdin.write('j');
    stdin.write('j');
    stdin.write('\r');
    stdin.write('n');
    expect(onResetGame).not.toHaveBeenCalled();
    expect(lastFrame()).toContain('Settings');
  });
});

describe('RaidLog component', () => {
  it('renders empty state', () => {
    const noop = vi.fn();
    const save = makeGameSave();
    const { lastFrame } = render(
      <RaidLog gameSave={save} onBack={noop} />,
    );
    expect(lastFrame()).toContain('No raids yet');
  });

  it('renders raid entries', () => {
    const noop = vi.fn();
    const save = makeGameSave({
      raidHistory: [makeRaidRecord(true), makeRaidRecord(false)],
    });
    const { lastFrame } = render(
      <RaidLog gameSave={save} onBack={noop} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('DEF');
    expect(frame).toContain('ATK');
  });

  it('shows achievements tab', async () => {
    const noop = vi.fn();
    const save = makeGameSave();
    const { stdin, lastFrame } = render(
      <RaidLog gameSave={save} onBack={noop} />,
    );
    stdin.write('t');
    await delay(50);
    const frame = lastFrame();
    expect(frame).toContain('Builder');
    expect(frame).toContain('Warden');
    expect(frame).toContain('1 / 10 earned');
  });

  it('shows earned achievement with star', async () => {
    const noop = vi.fn();
    const save = makeGameSave();
    const { stdin, lastFrame } = render(
      <RaidLog gameSave={save} onBack={noop} />,
    );
    stdin.write('t');
    await delay(50);
    expect(lastFrame()).toContain('★');
  });

  it('calls onBack when q is pressed', () => {
    const onBack = vi.fn();
    const save = makeGameSave();
    const { stdin } = render(
      <RaidLog gameSave={save} onBack={onBack} />,
    );
    stdin.write('q');
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onWatchReplay when Enter on raid entry', () => {
    const onWatchReplay = vi.fn();
    const noop = vi.fn();
    const save = makeGameSave({ raidHistory: [makeRaidRecord(true)] });
    const { stdin } = render(
      <RaidLog gameSave={save} onBack={noop} onWatchReplay={onWatchReplay} />,
    );
    stdin.write('\r');
    expect(onWatchReplay).toHaveBeenCalled();
  });

  it('navigates raid list with j/k', () => {
    const onWatchReplay = vi.fn();
    const noop = vi.fn();
    const save = makeGameSave({
      raidHistory: [makeRaidRecord(true), makeRaidRecord(false)],
    });
    const { stdin } = render(
      <RaidLog gameSave={save} onBack={noop} onWatchReplay={onWatchReplay} />,
    );
    stdin.write('j');
    stdin.write('\r');
    expect(onWatchReplay).toHaveBeenCalledWith(
      expect.objectContaining({ attackerId: 'p1' }),
    );
  });
});

describe('FriendList component', () => {
  it('renders NPC rival names', () => {
    const noop = vi.fn();
    const { lastFrame } = render(
      <FriendList onSelectFriend={noop} onBack={noop} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('Lord Ironhelm');
    expect(frame).toContain('Lady Ashwood');
    expect(frame).toContain('Baron Stonewatch');
  });

  it('shows tagline for selected rival', () => {
    const noop = vi.fn();
    const { lastFrame } = render(
      <FriendList onSelectFriend={noop} onBack={noop} />,
    );
    expect(lastFrame()).toContain('modest fortifications');
  });

  it('calls onBack when q pressed', () => {
    const onBack = vi.fn();
    const { stdin } = render(
      <FriendList onSelectFriend={vi.fn()} onBack={onBack} />,
    );
    stdin.write('q');
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onSelectFriend when Enter pressed', () => {
    const onSelectFriend = vi.fn();
    const { stdin } = render(
      <FriendList onSelectFriend={onSelectFriend} onBack={vi.fn()} />,
    );
    stdin.write('\r');
    expect(onSelectFriend).toHaveBeenCalledWith(
      expect.objectContaining({ ownerPlayerId: expect.any(String) }),
    );
  });

  it('navigates with j/k', async () => {
    const onSelectFriend = vi.fn();
    const { stdin, lastFrame } = render(
      <FriendList onSelectFriend={onSelectFriend} onBack={vi.fn()} />,
    );
    stdin.write('j');
    await delay(50);
    expect(lastFrame()).toContain('archers never miss');
  });
});

describe('KeepGrid component', () => {
  const emptyGrid: KeepGridState = { width: 16, height: 16, structures: [] };

  it('renders a 16x16 grid with hex headers', () => {
    const { lastFrame } = render(
      <KeepGrid grid={emptyGrid} cursor={{ x: 8, y: 8 }} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('0');
    expect(frame).toContain('F');
    expect(frame).toContain('·');
  });

  it('renders cursor position', () => {
    const { lastFrame } = render(
      <KeepGrid grid={emptyGrid} cursor={{ x: 0, y: 0 }} />,
    );
    expect(lastFrame()).toBeTruthy();
  });

  it('renders structures', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [
        { id: 'w1', kind: 'wall', level: 1, pos: { x: 5, y: 5 }, placedAtUnixMs: Date.now() },
        { id: 't1', kind: 'treasury', level: 2, pos: { x: 8, y: 8 }, placedAtUnixMs: Date.now() },
      ],
    };
    const { lastFrame } = render(
      <KeepGrid grid={grid} cursor={{ x: 0, y: 0 }} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('#');
    expect(frame).toContain('$');
  });

  it('renders range overlay when cursor is on archer tower', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [
        { id: 'a1', kind: 'archerTower', level: 1, pos: { x: 8, y: 8 }, placedAtUnixMs: Date.now() },
      ],
    };
    const { lastFrame } = render(
      <KeepGrid grid={grid} cursor={{ x: 8, y: 8 }} />,
    );
    expect(lastFrame()).toContain('░');
  });

  it('renders range overlay for watchtower', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [
        { id: 'wt1', kind: 'watchtower', level: 2, pos: { x: 8, y: 8 }, placedAtUnixMs: Date.now() },
      ],
    };
    const { lastFrame } = render(
      <KeepGrid grid={grid} cursor={{ x: 8, y: 8 }} />,
    );
    expect(lastFrame()).toContain('░');
  });

  it('renders range overlay for ward with watchtower boost', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [
        { id: 'wd1', kind: 'ward', level: 1, pos: { x: 8, y: 8 }, placedAtUnixMs: Date.now() },
        { id: 'wt1', kind: 'watchtower', level: 3, pos: { x: 9, y: 8 }, placedAtUnixMs: Date.now() },
      ],
    };
    const { lastFrame } = render(
      <KeepGrid grid={grid} cursor={{ x: 8, y: 8 }} />,
    );
    expect(lastFrame()).toContain('░');
  });

  it('renders in compact mode', () => {
    const { lastFrame } = render(
      <KeepGrid grid={emptyGrid} cursor={{ x: 8, y: 8 }} compact />,
    );
    expect(lastFrame()).toBeTruthy();
  });

  it('renders in ASCII mode', () => {
    const { lastFrame } = render(
      <KeepGrid grid={emptyGrid} cursor={{ x: 8, y: 8 }} asciiMode />,
    );
    const frame = lastFrame();
    expect(frame).toContain('+');
    expect(frame).toContain('-');
  });

  it('renders fragments', () => {
    const { lastFrame } = render(
      <KeepGrid grid={emptyGrid} cursor={{ x: 0, y: 0 }}
                fragments={[{ id: 'f1', type: 'gold_nugget', pos: { x: 5, y: 5 }, spawnedAtMs: Date.now() }]} />,
    );
    expect(lastFrame()).toContain('~');
  });

  it('renders level indicators for upgraded structures', () => {
    const grid: KeepGridState = {
      width: 16, height: 16,
      structures: [
        { id: 'w1', kind: 'wall', level: 2, pos: { x: 5, y: 5 }, placedAtUnixMs: Date.now() },
        { id: 'w2', kind: 'wall', level: 3, pos: { x: 6, y: 5 }, placedAtUnixMs: Date.now() },
      ],
    };
    const { lastFrame } = render(
      <KeepGrid grid={grid} cursor={{ x: 0, y: 0 }} />,
    );
    const frame = lastFrame();
    expect(frame).toContain('2');
    expect(frame).toContain('3');
  });
});
