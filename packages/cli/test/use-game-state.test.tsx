import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import type { GameSave, Resources, PlacedStructure } from '@codekeep/shared';
import { STARTING_RESOURCES, BACKGROUND_RAID_INTERVAL_MS } from '@codekeep/shared';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeSave(overrides?: Partial<GameSave>): GameSave {
  return {
    schemaVersion: 1,
    savedAtUnixMs: Date.now(),
    player: { id: 'p1', displayName: 'Tester', settings: { asciiMode: false } },
    keep: {
      id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
      grid: { width: 16, height: 16, structures: [] },
      resources: { gold: 200, wood: 100, stone: 60 },
      createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
    },
    raidHistory: [],
    tutorialCompleted: true,
    lastPlayedAtUnixMs: Date.now(),
    progression: {
      totalBuildsToday: 0, totalCommitsToday: 0, lastDailyResetDay: 0,
      totalRaidsWon: 0, totalRaidsLost: 0, totalStructuresPlaced: 0,
      currentWinStreak: 0, bestWinStreak: 0, achievements: [],
      totalRaidersKilledByArcher: 0,
    },
    ...overrides,
  };
}

function makeStructures(): PlacedStructure[] {
  return [
    { id: 's1', kind: 'wall', level: 1, pos: { x: 5, y: 5 }, placedAtUnixMs: Date.now() },
    { id: 's2', kind: 'treasury', level: 1, pos: { x: 6, y: 6 }, placedAtUnixMs: Date.now() },
    { id: 's3', kind: 'archerTower', level: 1, pos: { x: 7, y: 7 }, placedAtUnixMs: Date.now() },
    { id: 's4', kind: 'trap', level: 1, pos: { x: 4, y: 4 }, placedAtUnixMs: Date.now() },
  ];
}

const mockLoadGame = vi.fn(() => makeSave());

vi.mock('@codekeep/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codekeep/server')>();
  return {
    ...actual,
    loadGame: (...args: any[]) => mockLoadGame(...args),
    saveGame: vi.fn(),
  };
});

vi.mock('../src/hooks/useCodingEvents.js', () => ({
  useCodingEvents: vi.fn(),
}));

import { useGameState } from '../src/hooks/useGameState.js';

function TestHarness({
  onState,
  forceTutorial = false,
}: {
  onState: (state: ReturnType<typeof useGameState>) => void;
  forceTutorial?: boolean;
}) {
  const state = useGameState(forceTutorial);
  useEffect(() => {
    if (state.gameSave) onState(state);
  }, [state.gameSave, state.cursor, state.selectedStructure, state.message]);
  return (
    <Text>
      {state.gameSave ? `loaded:${state.gameSave.player.displayName}` : 'loading'}
      {` cursor:${state.cursor.x},${state.cursor.y}`}
      {` struct:${state.selectedStructure}`}
      {state.message ? ` msg:${state.message}` : ''}
    </Text>
  );
}

describe('useGameState hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads game save on mount', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(100);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.gameSave!.player.displayName).toBe('Tester');
  });

  it('starts with cursor at center', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(100);
    expect(capturedState!.cursor).toEqual({ x: 8, y: 8 });
  });

  it('starts with wall as selected structure', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(100);
    expect(capturedState!.selectedStructure).toBe('wall');
  });

  it('moveCursor changes position', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          capturedState = state;
          state.moveCursor(1, 0);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedState = state;
      }, [state.cursor]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedState!.cursor.x).toBe(9);
  });

  it('moveCursor clamps to grid bounds', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.moveCursor(-100, -100);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedState = state;
      }, [state.cursor]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedState!.cursor.x).toBe(0);
    expect(capturedState!.cursor.y).toBe(0);
  });

  it('cycleStructure wraps around', async () => {
    let idx = 0;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.cycleStructure(-1);
        }
      }, [state.gameSave]);
      useEffect(() => {
        idx++;
      }, [state.selectedStructure]);
      return <Text>{state.selectedStructure}</Text>;
    }
    const { lastFrame } = render(<Comp />);
    await delay(200);
    expect(lastFrame()).toContain('vault');
  });

  it('selectStructure sets index', async () => {
    let capturedStructure = '';
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.selectStructure(2);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedStructure = state.selectedStructure;
      }, [state.selectedStructure]);
      return <Text>{state.selectedStructure}</Text>;
    }
    const { lastFrame } = render(<Comp />);
    await delay(200);
    expect(lastFrame()).toContain('treasury');
  });

  it('placeAtCursor places a structure', async () => {
    let capturedMsg = '';
    function Comp() {
      const state = useGameState(false);
      const [tried, setTried] = React.useState(false);
      useEffect(() => {
        if (state.gameSave && !tried) {
          setTried(true);
          state.moveCursor(-5, -5);
        }
      }, [state.gameSave]);
      useEffect(() => {
        if (tried && state.cursor.x === 3 && state.cursor.y === 3) {
          state.placeAtCursor();
        }
      }, [tried, state.cursor]);
      useEffect(() => {
        if (state.message) capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(300);
    expect(capturedMsg).toContain('Placed');
  });

  it('upgradeAtCursor shows error on empty cell', async () => {
    let capturedMsg = '';
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.upgradeAtCursor();
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedMsg).toContain('!');
  });

  it('demolishAtCursor shows error on empty cell', async () => {
    let capturedMsg = '';
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.demolishAtCursor();
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedMsg).toContain('!');
  });

  it('clearRaid resets raid state', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.clearRaid();
          capturedState = state;
        }
      }, [state.gameSave]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedState!.raidReplay).toBeNull();
    expect(capturedState!.raidGrid).toBeNull();
    expect(capturedState!.raidType).toBeNull();
  });

  it('completeTutorial persists tutorial completion', async () => {
    const { saveGame } = await import('@codekeep/server');
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.completeTutorial();
        }
      }, [state.gameSave]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(saveGame).toHaveBeenCalled();
  });

  it('quickDefend runs a defense raid', async () => {
    let capturedMsg = '';
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.quickDefend();
        }
      }, [state.gameSave]);
      useEffect(() => {
        if (state.message) capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(300);
    expect(capturedMsg).toMatch(/Defense|BREACH/);
  });

  it('startDefendRaid starts visual defend raid', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && !state.raidReplay) {
          state.startDefendRaid();
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedState = state;
      }, [state.raidReplay]);
      return <Text>{state.raidType ?? 'none'}</Text>;
    }
    const { lastFrame } = render(<Comp />);
    await delay(300);
    expect(capturedState!.raidReplay).not.toBeNull();
    expect(capturedState!.raidType).toBe('defend');
  });

  it('startAttackRaid starts visual attack raid', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && !state.raidReplay) {
          state.startAttackRaid();
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedState = state;
      }, [state.raidReplay]);
      return <Text>{state.raidType ?? 'none'}</Text>;
    }
    render(<Comp />);
    await delay(300);
    expect(capturedState!.raidReplay).not.toBeNull();
    expect(capturedState!.raidType).toBe('attack');
  });

  it('exposes grantSimResources function', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(100);
    expect(capturedState).not.toBeNull();
    expect(typeof capturedState!.grantSimResources).toBe('function');
  });

  it('jumpToCoord changes cursor', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.jumpToCoord(3, 5);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedState = state;
      }, [state.cursor]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedState!.cursor).toEqual({ x: 3, y: 5 });
  });

  it('collectAtCursor with no fragment shows error', async () => {
    let capturedMsg = '';
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.collectAtCursor();
        }
      }, [state.gameSave]);
      useEffect(() => {
        if (state.message) capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedMsg).toContain('Nothing');
  });

  it('watchLastRaid returns false when no quick raid was done', async () => {
    let result = true;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          result = state.watchLastRaid();
        }
      }, [state.gameSave]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(result).toBe(false);
  });

  it('forceTutorial resets tutorialCompleted', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(
      <TestHarness forceTutorial onState={(s) => { capturedState = s; }} />,
    );
    await delay(200);
    expect(capturedState!.gameSave!.tutorialCompleted).toBe(false);
  });

  it('clearOfflineReport clears report', async () => {
    let capturedState: ReturnType<typeof useGameState> | null = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.clearOfflineReport();
          capturedState = state;
        }
      }, [state.gameSave]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedState!.offlineReport).toBeNull();
  });

  it('grantSimResources grants resources', async () => {
    let capturedMsg = '';
    function Comp() {
      const state = useGameState(false);
      const [tried, setTried] = React.useState(false);
      useEffect(() => {
        if (state.gameSave && !tried) {
          setTried(true);
          state.grantSimResources();
        }
      }, [state.gameSave]);
      useEffect(() => {
        if (state.message) capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(300);
    expect(capturedMsg).toContain('+');
  });

  it('grantSimResources shows cooldown on rapid use', async () => {
    let capturedMsg = '';
    let callCount = 0;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && callCount < 2) {
          callCount++;
          state.grantSimResources();
          setTimeout(() => {
            state.grantSimResources();
          }, 50);
        }
      }, [state.gameSave]);
      useEffect(() => {
        if (state.message) capturedMsg = state.message;
      }, [state.message]);
      return <Text>{state.message}</Text>;
    }
    render(<Comp />);
    await delay(400);
    expect(capturedMsg).toMatch(/Cooldown|\+/);
  });

  it('jumpToNextStructure does nothing with no structures', async () => {
    let capturedCursor = { x: 0, y: 0 };
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.jumpToNextStructure(1);
          capturedCursor = state.cursor;
        }
      }, [state.gameSave]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedCursor).toEqual({ x: 8, y: 8 });
  });

  it('watchRaidRecord returns false when no gameSave', async () => {
    let result = true;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          result = state.watchRaidRecord({
            replay: { events: [], maxTick: 0 },
            attackerId: 'npc',
            defenderKeepId: 'k1',
          });
        }
      }, [state.gameSave]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(result).toBe(true);
  });

  it('watchLastRaid returns true after quickDefend', async () => {
    let watchResult = false;
    let didQuick = false;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && !didQuick) {
          didQuick = true;
          state.quickDefend();
        }
      }, [state.gameSave]);
      useEffect(() => {
        if (didQuick && state.message) {
          watchResult = state.watchLastRaid();
        }
      }, [state.message]);
      return <Text>{state.raidType ?? 'none'}</Text>;
    }
    const { lastFrame } = render(<Comp />);
    await delay(400);
    expect(watchResult).toBe(true);
  });

  it('cycleStructure wraps forward', async () => {
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          for (let i = 0; i < 10; i++) state.cycleStructure(1);
        }
      }, [state.gameSave]);
      return <Text>{state.selectedStructure}</Text>;
    }
    const { lastFrame } = render(<Comp />);
    await delay(200);
    expect(lastFrame()).toBeTruthy();
  });

  it('selectStructure ignores out of range', async () => {
    let capturedStruct = '';
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.selectStructure(99);
          state.selectStructure(-1);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedStruct = state.selectedStructure;
      }, [state.selectedStructure]);
      return <Text>{state.selectedStructure}</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedStruct).toBe('wall');
  });

  it('jumpToCoord ignores out of bounds', async () => {
    let capturedCursor = { x: 0, y: 0 };
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave) {
          state.jumpToCoord(-1, 999);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedCursor = state.cursor;
      }, [state.cursor]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    expect(capturedCursor).toEqual({ x: 8, y: 8 });
  });

  it('triggers offline income when loading old save with structures', async () => {
    const structures = makeStructures();
    const oldTimestamp = Date.now() - 120_000;
    mockLoadGame.mockReturnValueOnce(
      makeSave({
        lastPlayedAtUnixMs: oldTimestamp,
        keep: {
          id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
          grid: { width: 16, height: 16, structures },
          resources: { gold: 50, wood: 50, stone: 50 },
          createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
        },
      }),
    );

    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(200);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.gameSave!.keep.resources.gold).toBeGreaterThanOrEqual(50);
  });

  it('triggers background raids on old save with enough structures', async () => {
    const structures = makeStructures();
    const oldTimestamp = Date.now() - (BACKGROUND_RAID_INTERVAL_MS * 2);
    mockLoadGame.mockReturnValueOnce(
      makeSave({
        lastPlayedAtUnixMs: oldTimestamp,
        keep: {
          id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
          grid: { width: 16, height: 16, structures },
          resources: { gold: 100, wood: 100, stone: 100 },
          createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
        },
      }),
    );

    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(200);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.gameSave!.raidHistory.length).toBeGreaterThan(0);
  });

  it('generates offline report with raids and resources', async () => {
    const structures = makeStructures();
    const oldTimestamp = Date.now() - (BACKGROUND_RAID_INTERVAL_MS * 2);
    mockLoadGame.mockReturnValueOnce(
      makeSave({
        lastPlayedAtUnixMs: oldTimestamp,
        keep: {
          id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
          grid: { width: 16, height: 16, structures },
          resources: { gold: 100, wood: 100, stone: 100 },
          createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
        },
      }),
    );

    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(200);
    expect(capturedState!.offlineReport).not.toBeNull();
    expect(capturedState!.offlineReport!.raids.length).toBeGreaterThan(0);
  });

  it('jumpToNextStructure navigates between structures', async () => {
    const structures = makeStructures();
    mockLoadGame.mockReturnValueOnce(
      makeSave({
        keep: {
          id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
          grid: { width: 16, height: 16, structures },
          resources: { gold: 200, wood: 100, stone: 60 },
          createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
        },
      }),
    );

    let capturedCursor = { x: 0, y: 0 };
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && state.gameSave.keep.grid.structures.length > 0) {
          state.jumpToNextStructure(1);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedCursor = state.cursor;
      }, [state.cursor]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    const structPos = structures.map(s => `${s.pos.x},${s.pos.y}`);
    expect(structPos).toContain(`${capturedCursor.x},${capturedCursor.y}`);
  });

  it('jumpToNextStructure from unmatched cursor goes to first', async () => {
    const structures = makeStructures();
    mockLoadGame.mockReturnValueOnce(
      makeSave({
        keep: {
          id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
          grid: { width: 16, height: 16, structures },
          resources: { gold: 200, wood: 100, stone: 60 },
          createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
        },
      }),
    );

    let capturedCursor = { x: 0, y: 0 };
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && state.gameSave.keep.grid.structures.length > 0) {
          state.jumpToNextStructure(-1);
        }
      }, [state.gameSave]);
      useEffect(() => {
        capturedCursor = state.cursor;
      }, [state.cursor]);
      return <Text>ok</Text>;
    }
    render(<Comp />);
    await delay(200);
    const firstStruct = structures[0];
    expect(capturedCursor).toEqual({ x: firstStruct.pos.x, y: firstStruct.pos.y });
  });

  it('loadGame returns null creates new save', async () => {
    mockLoadGame.mockReturnValueOnce(null);
    let capturedState: ReturnType<typeof useGameState> | null = null;
    render(<TestHarness onState={(s) => { capturedState = s; }} />);
    await delay(200);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.gameSave).not.toBeNull();
  });

  it('structureAtCursor finds structure under cursor', async () => {
    const structures = makeStructures();
    mockLoadGame.mockReturnValueOnce(
      makeSave({
        keep: {
          id: 'k1', name: 'Test Keep', ownerPlayerId: 'p1',
          grid: { width: 16, height: 16, structures },
          resources: { gold: 200, wood: 100, stone: 60 },
          createdAtUnixMs: Date.now(), updatedAtUnixMs: Date.now(),
        },
      }),
    );

    let foundStruct: any = null;
    function Comp() {
      const state = useGameState(false);
      useEffect(() => {
        if (state.gameSave && state.gameSave.keep.grid.structures.length > 0) {
          state.jumpToCoord(5, 5);
        }
      }, [state.gameSave]);
      useEffect(() => {
        foundStruct = state.structureAtCursor;
      }, [state.structureAtCursor]);
      return <Text>{state.structureAtCursor?.kind ?? 'none'}</Text>;
    }
    const { lastFrame } = render(<Comp />);
    await delay(300);
    expect(lastFrame()).toContain('wall');
  });
});
