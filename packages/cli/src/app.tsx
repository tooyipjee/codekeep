import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { GameSave } from '@codekeep/shared';
import { loadGame, saveGame, createNewGameSave, deleteSaveFile, simulateRaid } from '@codekeep/server';
import { RESOURCE_ICONS } from '@codekeep/shared';
import { KeepGrid } from './components/KeepGrid.js';
import { HUD } from './components/HUD.js';
import { Help } from './components/Help.js';
import { Menu } from './components/Menu.js';
import { RaidView } from './components/RaidView.js';
import { Tutorial } from './components/Tutorial.js';
import { StructurePicker } from './components/StructurePicker.js';
import { FriendList } from './components/FriendList.js';
import { RaidLog } from './components/RaidLog.js';
import { Settings } from './components/Settings.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { useGameState } from './hooks/useGameState.js';
import type { Keep, RaidReplay as RaidReplayType, KeepGridState, RaidRecord } from '@codekeep/shared';

const MIN_COLS = 60;
const MIN_ROWS = 18;

function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout?.columns ?? process.stdout.columns ?? 80,
    rows: stdout?.rows ?? process.stdout.rows ?? 24,
  });

  useEffect(() => {
    const target = stdout ?? process.stdout;
    const onResize = () => {
      setSize({ columns: target.columns, rows: target.rows });
    };
    target.on('resize', onResize);
    return () => { target.off('resize', onResize); };
  }, [stdout]);

  return size;
}

type Screen = 'menu' | 'keep' | 'raid' | 'friendList' | 'friendRaid' | 'tutorial' | 'raidLog' | 'settings';

interface AppProps {
  asciiMode: boolean;
  compact: boolean;
  forceTutorial: boolean;
  autoResume: boolean;
}

function AppContent({ asciiMode, compact, forceTutorial, autoResume }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [screen, setScreen] = useState<Screen>(autoResume ? 'keep' : 'menu');
  const [showHelp, setShowHelp] = useState(false);
  const [friendRaidReplay, setFriendRaidReplay] = useState<RaidReplayType | null>(null);
  const [friendKeepGrid, setFriendKeepGrid] = useState<KeepGridState | null>(null);
  const [coordMode, setCoordMode] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [raidReturnScreen, setRaidReturnScreen] = useState<Screen>('keep');
  const raidSpeedRef = useRef<1 | 2 | 4 | 8>(2);

  const isCompact = compact || columns < 80 || rows < 24;
  const tooSmall = columns < MIN_COLS || rows < MIN_ROWS;

  const {
    gameSave,
    cursor,
    selectedStructure,
    message,
    fragments,
    raidReplay,
    raidGrid,
    raidType,
    raidSummary,
    offlineReport,
    structureAtCursor,
    moveCursor,
    cycleStructure,
    selectStructure,
    placeAtCursor,
    upgradeAtCursor,
    demolishAtCursor,
    collectAtCursor,
    startAttackRaid,
    startDefendRaid,
    quickDefend,
    watchLastRaid,
    watchRaidRecord,
    clearRaid,
    completeTutorial,
    grantSimResources,
    jumpToCoord,
    jumpToNextStructure,
    clearOfflineReport,
  } = useGameState(forceTutorial);

  const handleQuit = useCallback(() => {
    exit();
  }, [exit]);

  const handleResetGame = useCallback(() => {
    deleteSaveFile();
    exit();
  }, [exit]);

  useInput((input, key) => {
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    if (input === '?') {
      setShowHelp(true);
      return;
    }

    // Coordinate jump mode
    if (coordMode) {
      if (key.escape) {
        setCoordMode(false);
        setCoordInput('');
        return;
      }
      if (key.return) {
        const parts = coordInput.split(/[, ]+/);
        if (parts.length === 2) {
          const x = parseInt(parts[0], 16);
          const y = parseInt(parts[1], 16);
          if (!isNaN(x) && !isNaN(y)) jumpToCoord(x, y);
        }
        setCoordMode(false);
        setCoordInput('');
        return;
      }
      if (key.backspace || key.delete) {
        setCoordInput((prev) => prev.slice(0, -1));
        return;
      }
      if (/^[0-9a-fA-F, ]$/.test(input)) {
        setCoordInput((prev) => prev + input);
      }
      return;
    }

    // Offline bonus dismissal
    if (offlineReport && screen === 'keep') {
      clearOfflineReport();
    }

    if (screen === 'menu') {
      if (input === 'q') {
        handleQuit();
        return;
      }
      return;
    }

    if (screen === 'tutorial') {
      return;
    }

    if (screen === 'raid' || screen === 'friendRaid') {
      if (input === 'q' || key.escape) {
        clearRaid();
        setFriendRaidReplay(null);
        setFriendKeepGrid(null);
        setScreen('keep');
      }
      return;
    }

    if (screen === 'friendList' || screen === 'raidLog' || screen === 'settings') {
      return;
    }

    // Keep screen input
    if (input === 'q') {
      handleQuit();
      return;
    }

    if (key.escape) {
      setScreen('menu');
      return;
    }

    // Movement
    if (input === 'h' || input === 'a' || key.leftArrow) moveCursor(-1, 0);
    else if (input === 'l' || input === 'd' || key.rightArrow) moveCursor(1, 0);
    else if (input === 'k' || input === 'w' || key.upArrow) moveCursor(0, -1);
    else if (input === 'j' || input === 's' || key.downArrow) moveCursor(0, 1);

    // Actions
    else if (key.return || input === 'e') placeAtCursor();
    else if (input === 'u') upgradeAtCursor();
    else if (input === 'x') demolishAtCursor();
    else if (input === '[') cycleStructure(-1);
    else if (input === ']') cycleStructure(1);
    else if (input === 'f') grantSimResources();

    // Collect fragment at cursor
    else if (input === 'c') collectAtCursor();

    // Quick defend from keep screen
    else if (input === 'r') quickDefend();

    // View last quick-defend replay
    else if (input === 'v') {
      if (watchLastRaid()) setScreen('raid');
    }

    // Coordinate jump
    else if (input === 'g') {
      setCoordMode(true);
      setCoordInput('');
    }

    // Structure tabbing
    else if (key.tab) jumpToNextStructure(1);

    // Number keys for structure selection (1-6)
    else if (input >= '1' && input <= '6') selectStructure(parseInt(input) - 1);
  });

  if (!gameSave) {
    return <Text>Loading...</Text>;
  }

  if (tooSmall) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">{'◆ CodeKeep'}</Text>
        <Text> </Text>
        <Text color="red">Terminal too small</Text>
        <Text>Need <Text bold>{MIN_COLS}x{MIN_ROWS}</Text>, got <Text bold>{columns}x{rows}</Text></Text>
        <Text> </Text>
        <Text dimColor>Resize your terminal or run with --compact</Text>
      </Box>
    );
  }

  if (showHelp) {
    return <Help />;
  }

  if (screen === 'tutorial' || !gameSave.tutorialCompleted) {
    return (
      <Tutorial
        gameSave={gameSave}
        onComplete={() => {
          completeTutorial();
          setScreen('keep');
        }}
      />
    );
  }

  if (screen === 'menu') {
    return (
      <Menu
        gameSave={gameSave}
        onKeep={() => setScreen('keep')}
        onAttack={() => {
          startAttackRaid();
          setScreen('raid');
        }}
        onDefend={() => {
          startDefendRaid();
          setScreen('raid');
        }}
        onFriendRaid={() => setScreen('friendList')}
        onRaidLog={() => setScreen('raidLog')}
        onSettings={() => setScreen('settings')}
        onQuit={handleQuit}
      />
    );
  }

  if (screen === 'raidLog') {
    return (
      <RaidLog
        gameSave={gameSave}
        onBack={() => setScreen('menu')}
        onWatchReplay={(record) => {
          if (watchRaidRecord(record)) {
            setRaidReturnScreen('raidLog');
            setScreen('raid');
          }
        }}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <Settings
        onBack={() => setScreen('menu')}
        onResetGame={handleResetGame}
      />
    );
  }

  if (screen === 'friendList') {
    return (
      <FriendList
        onSelectFriend={(friendKeep: Keep) => {
          const seed = `friend-raid-${Date.now()}`;
          const replay = simulateRaid({
            probeCount: 4,
            keepGrid: friendKeep.grid,
            seed,
          });
          setFriendRaidReplay(replay);
          setFriendKeepGrid(friendKeep.grid);
          setScreen('friendRaid');
        }}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'friendRaid' && friendRaidReplay && friendKeepGrid) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">{'[ LOCAL SIMULATION ]'}</Text>
        <RaidView
          replay={friendRaidReplay}
          keepGrid={friendKeepGrid}
          raidType="attack"
          initialSpeed={raidSpeedRef.current}
          onSpeedChange={(s) => { raidSpeedRef.current = s; }}
          onDone={() => {
            setFriendRaidReplay(null);
            setFriendKeepGrid(null);
            setScreen('menu');
          }}
        />
      </Box>
    );
  }

  if (screen === 'raid' && raidReplay && raidGrid) {
    return (
      <RaidView
        replay={raidReplay}
        keepGrid={raidGrid}
        raidType={raidType || 'defend'}
        summary={raidSummary || undefined}
        initialSpeed={raidSpeedRef.current}
        onSpeedChange={(s) => { raidSpeedRef.current = s; }}
        onDone={() => {
          clearRaid();
          setScreen(raidReturnScreen);
          setRaidReturnScreen('keep');
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      {offlineReport && (
        <Box flexDirection="column">
          {(offlineReport.resources.gold > 0 || offlineReport.resources.wood > 0 || offlineReport.resources.stone > 0) && (
            <Text color="green">Passive income: +{offlineReport.resources.gold}{RESOURCE_ICONS.gold} +{offlineReport.resources.wood}{RESOURCE_ICONS.wood} +{offlineReport.resources.stone}{RESOURCE_ICONS.stone}</Text>
          )}
          {offlineReport.raids.length > 0 && (
            <Text color="yellow">Background raids: {offlineReport.raids.filter(r => r.won).length}W / {offlineReport.raids.filter(r => !r.won).length}L</Text>
          )}
          {offlineReport.newAchievements.length > 0 && (
            <Text color="magenta" bold>New achievements: {offlineReport.newAchievements.join(', ')}</Text>
          )}
          <Text dimColor>(press any key to continue)</Text>
        </Box>
      )}
      <HUD
        resources={gameSave.keep.resources}
        selectedStructure={selectedStructure}
        message={coordMode ? `Jump to: ${coordInput}_` : message}
        compact={isCompact}
        structureAtCursor={structureAtCursor}
        fragmentCount={fragments.length}
      />
      <Box flexDirection="row">
        <KeepGrid
          grid={gameSave.keep.grid}
          cursor={cursor}
          asciiMode={asciiMode}
          compact={isCompact}
          fragments={fragments}
        />
        {!isCompact && (
          <Box flexDirection="column" marginLeft={2} width={28}>
            <StructurePicker selected={selectedStructure} />
            <Box marginTop={1}>
              <Text dimColor>
                {'e place  u upgrade  x demo\n[ ] cycle  1-6 select\nc collect  r raid  v replay\ng jump  Tab next  f +res\n?help  Esc menu  q quit'}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
      {isCompact && (
        <Text dimColor>e/u/x build  c collect  r raid  v replay  f +res  q quit</Text>
      )}
    </Box>
  );
}

export function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <AppContent {...props} />
    </ErrorBoundary>
  );
}
