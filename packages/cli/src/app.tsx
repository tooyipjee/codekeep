import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { GameSave } from '@codekeep/shared';
import { loadGame, saveGame, createNewGameSave, deleteSaveFile, simulateRaid, canPrestige, performPrestige, getPrestigeLevel } from '@codekeep/server';
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
import { PvpMenu } from './components/PvpMenu.js';
import { WarCampView } from './components/WarCampView.js';
import { LeaderboardView } from './components/LeaderboardView.js';
import { AuthView } from './components/AuthView.js';
import { RaidPlanner } from './components/RaidPlanner.js';
import { DailyChallenge } from './components/DailyChallenge.js';
import { RewardChoice } from './components/RewardChoice.js';
import { PrestigeView } from './components/PrestigeView.js';
import { useGameState } from './hooks/useGameState.js';
import { generatePostcard } from './lib/postcard.js';
import { exec } from 'node:child_process';
import { OnlineBackend } from './lib/online-backend.js';
import type { MatchTarget, PvpProfile, LeaderboardEntry } from './lib/backend.js';
import type { Keep, RaidReplay as RaidReplayType, KeepGridState, RaidRecord, ProbeType, WarCamp, RaidSpawnSpec } from '@codekeep/shared';

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

type Screen = 'menu' | 'keep' | 'raid' | 'friendList' | 'friendRaid' | 'tutorial' | 'raidLog' | 'settings' | 'pvp' | 'warcamp' | 'leaderboard' | 'auth' | 'raidPlanner' | 'dailyChallenge' | 'prestige';

interface AppProps {
  asciiMode: boolean;
  compact: boolean;
  forceTutorial: boolean;
  autoResume: boolean;
  serverUrl?: string;
  dryRun?: boolean;
}

function AppContent({ asciiMode: initialAsciiMode, compact, forceTutorial, autoResume, serverUrl, dryRun }: AppProps) {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [screen, setScreen] = useState<Screen>(serverUrl ? 'auth' : autoResume ? 'keep' : 'menu');
  const [asciiMode, setAsciiMode] = useState(initialAsciiMode);
  const [showHelp, setShowHelp] = useState(false);
  const [friendRaidReplay, setFriendRaidReplay] = useState<RaidReplayType | null>(null);
  const [friendKeepGrid, setFriendKeepGrid] = useState<KeepGridState | null>(null);
  const [coordMode, setCoordMode] = useState(false);
  const [coordInput, setCoordInput] = useState('');
  const [raidReturnScreen, setRaidReturnScreen] = useState<Screen>('keep');
  const raidSpeedRef = useRef<1 | 2 | 4 | 8>(1);

  // Online state
  const onlineBackendRef = useRef(serverUrl ? new OnlineBackend(serverUrl) : null);
  const [onlineMode, setOnlineMode] = useState(false);
  const [pvpProfile, setPvpProfile] = useState<PvpProfile | null>(null);
  const [matchTargets, setMatchTargets] = useState<MatchTarget[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [warCamp, setWarCamp] = useState<WarCamp>({ slots: [], maxSlots: 3 });
  const [selectedTarget, setSelectedTarget] = useState<MatchTarget | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

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
    undoLastAction,
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
    saveDailyChallengeScore,
    showMessage,
    siegeForecast,
    flowMultiplier,
    activeSynergies,
    synergyStructureIds,
    raidAnomalies,
    pendingRewards,
    claimReward,
    dismissRewards,
    applyExternalSave,
    getSessionStats,
  } = useGameState(forceTutorial, dryRun);

  const [sessionSummary, setSessionSummary] = useState<import('../hooks/useGameState.js').SessionStats | null>(null);

  const handleQuit = useCallback(() => {
    const stats = getSessionStats();
    if (stats && (stats.raidsWon + stats.raidsLost > 0 || stats.structuresBuilt > 0)) {
      setSessionSummary(stats);
      setTimeout(() => exit(), 3000);
    } else {
      exit();
    }
  }, [exit, getSessionStats]);

  const handleResetGame = useCallback(() => {
    deleteSaveFile();
    exit();
  }, [exit]);

  const handleAuth = useCallback(async (type: 'login' | 'register', value: string) => {
    const backend = onlineBackendRef.current;
    if (!backend) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (type === 'login') {
        await backend.login(value);
      } else {
        await backend.register(value);
      }
      setOnlineMode(true);
      setScreen('menu');
      backend.getPvpProfile?.().then((p) => setPvpProfile(p));
      backend.registerForMatchmaking?.();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSearchMatch = useCallback(async () => {
    const backend = onlineBackendRef.current;
    if (!backend?.findMatch) return;
    setIsSearching(true);
    try {
      const targets = await backend.findMatch();
      setMatchTargets(targets);
    } catch {
      setMatchTargets([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handlePvpAttack = useCallback(async (target: MatchTarget, probeTypes: ProbeType[], spawnSpecs?: RaidSpawnSpec[]) => {
    const backend = onlineBackendRef.current;
    if (!backend?.launchPvpRaid || !gameSave) return;
    try {
      const result = await backend.launchPvpRaid(target.playerId, probeTypes, spawnSpecs);
      const watched = watchRaidRecord({
        replay: result.replay,
        attackerId: gameSave.player.id,
        defenderKeepId: target.playerId,
        defenderGrid: target.grid,
      });
      if (watched) {
        setRaidReturnScreen('pvp');
        setScreen('raid');
      }
      setPvpProfile((prev) => prev ? { ...prev, trophies: result.newTrophies, league: result.newLeague } : prev);
    } catch {
      // Failed to launch raid
    }
  }, [gameSave, watchRaidRecord]);

  const handleLoadLeaderboard = useCallback(async () => {
    const backend = onlineBackendRef.current;
    if (!backend?.getLeaderboard) return;
    setIsLoadingLeaderboard(true);
    try {
      const entries = await backend.getLeaderboard();
      setLeaderboard(entries);
    } catch {
      setLeaderboard([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  useInput((input, key) => {
    if (sessionSummary) {
      exit();
      return;
    }

    if (pendingRewards && screen === 'keep') return;

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

    if (offlineReport && screen === 'keep') {
      if (key.return || input === ' ') {
        clearOfflineReport();
      }
      return;
    }

    if (screen === 'menu') {
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

    if (screen === 'friendList' || screen === 'raidLog' || screen === 'settings'
        || screen === 'pvp' || screen === 'warcamp' || screen === 'leaderboard' || screen === 'auth'
        || screen === 'raidPlanner' || screen === 'dailyChallenge') {
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

    // Undo last placement
    else if (input === 'z') undoLastAction();

    // Keep postcard
    else if (input === 'p' || input === 'P') {
      if (gameSave) {
        const card = generatePostcard(gameSave);
        const copyCmd = process.platform === 'darwin' ? 'pbcopy' : process.platform === 'win32' ? 'clip' : 'xclip -selection clipboard';
        const child = exec(copyCmd, () => {});
        child.stdin?.write(card);
        child.stdin?.end();
        showMessage('Keep postcard copied to clipboard!');
      }
    }

    // Structure tabbing
    else if (key.tab) jumpToNextStructure(1);

    // Number keys for structure selection (1-6)
    else if (input >= '1' && input <= '6') selectStructure(parseInt(input) - 1);
  });

  if (sessionSummary) {
    const elapsed = Math.floor((Date.now() - sessionSummary.startedAt) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold color="yellow">{'◆ Session Summary'}</Text>
        <Text>Time played: <Text bold>{mins}m {secs}s</Text></Text>
        <Text>Raids: <Text color="green" bold>{sessionSummary.raidsWon} won</Text> / <Text color="red" bold>{sessionSummary.raidsLost} lost</Text></Text>
        <Text>Structures built: <Text bold>{sessionSummary.structuresBuilt}</Text></Text>
        <Text>Resources earned: <Text color="yellow">{RESOURCE_ICONS.gold}{sessionSummary.resourcesEarned.gold}</Text> <Text color="green">{RESOURCE_ICONS.wood}{sessionSummary.resourcesEarned.wood}</Text> <Text color="white">{RESOURCE_ICONS.stone}{sessionSummary.resourcesEarned.stone}</Text></Text>
        {sessionSummary.achievementsUnlocked > 0 && (
          <Text color="magenta" bold>Achievements unlocked: {sessionSummary.achievementsUnlocked}</Text>
        )}
        <Text dimColor>(press any key to exit)</Text>
      </Box>
    );
  }

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

  if (screen === 'auth') {
    return (
      <AuthView
        error={authError}
        isLoading={authLoading}
        onLogin={(key) => handleAuth('login', key)}
        onRegister={(name) => handleAuth('register', name)}
        onPlayOffline={() => {
          setOnlineMode(false);
          setScreen('menu');
        }}
      />
    );
  }

  if (screen === 'menu') {
    return (
      <Menu
        gameSave={gameSave}
        onlineMode={onlineMode}
        onKeep={() => setScreen('keep')}
        onAttack={() => {
          startAttackRaid();
          setScreen('raid');
        }}
        onDefend={() => {
          startDefendRaid();
          setScreen('raid');
        }}
        onPvp={() => setScreen('pvp')}
        onDailyChallenge={() => setScreen('dailyChallenge')}
        onPrestige={() => setScreen('prestige')}
        onFriendRaid={() => setScreen('friendList')}
        onRaidLog={() => setScreen('raidLog')}
        onSettings={() => setScreen('settings')}
        onQuit={handleQuit}
      />
    );
  }

  if (screen === 'prestige') {
    const prestigeCheck = canPrestige(gameSave);
    return (
      <PrestigeView
        gameSave={gameSave}
        eligible={prestigeCheck.eligible}
        reason={prestigeCheck.reason}
        onPrestige={() => {
          const newSave = performPrestige(gameSave);
          applyExternalSave(newSave);
          showMessage('★ Ascension complete! Your keep has been reborn.');
          setScreen('menu');
        }}
        onBack={() => setScreen('menu')}
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
        onReplayTutorial={() => setScreen('tutorial')}
        asciiMode={asciiMode}
        onToggleAscii={() => setAsciiMode(a => !a)}
      />
    );
  }

  if (screen === 'dailyChallenge') {
    return (
      <DailyChallenge
        onBack={() => setScreen('menu')}
        onSaveScore={saveDailyChallengeScore}
      />
    );
  }

  if (screen === 'pvp') {
    return (
      <PvpMenu
        pvpProfile={pvpProfile}
        targets={matchTargets}
        isSearching={isSearching}
        onSearch={handleSearchMatch}
        onAttack={(target) => {
          setSelectedTarget(target);
          setScreen('raidPlanner');
        }}
        onWarCamp={() => {
          const backend = onlineBackendRef.current;
          backend?.getWarCamp?.().then((camp) => { if (camp) setWarCamp(camp); });
          setScreen('warcamp');
        }}
        onLeaderboard={() => {
          handleLoadLeaderboard();
          setScreen('leaderboard');
        }}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'raidPlanner' && selectedTarget) {
    return (
      <RaidPlanner
        targetName={selectedTarget.displayName}
        targetTrophies={selectedTarget.trophies}
        targetGrid={selectedTarget.grid}
        warCamp={warCamp}
        resources={gameSave.keep.resources}
        onLaunch={(spawnSpecs) => {
          const probeTypes = spawnSpecs.map((s) => s.raiderType);
          handlePvpAttack(selectedTarget, probeTypes, spawnSpecs);
          setSelectedTarget(null);
        }}
        onBack={() => {
          setSelectedTarget(null);
          setScreen('pvp');
        }}
      />
    );
  }

  if (screen === 'warcamp') {
    return (
      <WarCampView
        warCamp={warCamp}
        resources={gameSave.keep.resources}
        onTrain={(slotId, type) => {
          const backend = onlineBackendRef.current;
          backend?.trainRaider?.(slotId, type).then((camp) => setWarCamp(camp));
        }}
        onBack={() => setScreen('pvp')}
      />
    );
  }

  if (screen === 'leaderboard') {
    return (
      <LeaderboardView
        entries={leaderboard}
        currentPlayerId={gameSave.player.id}
        isLoading={isLoadingLeaderboard}
        onBack={() => setScreen('pvp')}
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
        anomalies={raidAnomalies}
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
      {pendingRewards && (
        <RewardChoice
          options={pendingRewards}
          anomalyNames={raidAnomalies.map((a) => `${a.icon} ${a.name}`)}
          onClaim={claimReward}
          onDismiss={dismissRewards}
        />
      )}
      <HUD
        resources={gameSave.keep.resources}
        selectedStructure={selectedStructure}
        message={coordMode ? `Jump to: ${coordInput}_` : message}
        compact={isCompact}
        structureAtCursor={structureAtCursor}
        fragmentCount={fragments.length}
        dryRun={dryRun}
        siegeForecast={siegeForecast}
        flowMultiplier={flowMultiplier}
        activeBuffs={gameSave.activeBuffs}
      />
      <Box flexDirection="row">
        <KeepGrid
          grid={gameSave.keep.grid}
          cursor={cursor}
          asciiMode={asciiMode}
          compact={isCompact}
          fragments={fragments}
          synergyStructureIds={synergyStructureIds}
        />
        {!isCompact && (
          <Box flexDirection="column" marginLeft={2} width={28}>
            <StructurePicker selected={selectedStructure} />
            {activeSynergies.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text bold color="magenta">Active Synergies:</Text>
                {[...new Set(activeSynergies.map((s) => s.name))].map((name) => (
                  <Text key={name} color="magenta">{' ★ '}{name}</Text>
                ))}
              </Box>
            )}
            <Box marginTop={1}>
              <Text dimColor>
                {'e place  u upgrade  x demo\nz undo  p postcard\n[ ] cycle  1-6 select\nr raid  v replay  f +res\ng jump  Tab next  ~ auto\n?help  Esc menu  q quit'}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
      {isCompact && (
        <Text dimColor>e/u/x build  r raid  v replay  f +res  ~ auto-collect  q quit</Text>
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
