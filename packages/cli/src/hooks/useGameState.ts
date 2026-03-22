import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameSave, GridCoord, StructureKind, RaidReplay, Resources, KeepGridState, ProbeType, DataFragment, RaidAnomaly, ActiveBuff, RewardOption, RaidModifiers } from '@codekeep/shared';
import { GRID_SIZE, ALL_STRUCTURE_KINDS, BACKGROUND_RAID_INTERVAL_MS, BACKGROUND_RAID_MAX, FAUCET_BASE_USES, ACHIEVEMENTS, FRAGMENT_SPAWN_INTERVAL_MS, KINGDOM_EVENT_NAMES, RESOURCE_ICONS } from '@codekeep/shared';
import {
  loadGame,
  saveGame,
  createNewGameSave,
  placeStructure,
  upgradeStructure,
  demolishStructure,
  simulateRaid,
  generateNpcKeep,
  grantCodingEventResources,
  simulateFaucetEvent,
  calculateOfflineResources,
  capResources,
  addResources,
  spawnFragments,
  collectFragment,
  decayFragments,
  evaluateSynergies,
  hasUnlock,
} from '@codekeep/server';
import { useCodingEvents } from './useCodingEvents.js';
import {
  raidDifficulty,
  buildProbeTypes,
  simpleRng,
  ensureProgression,
  getAchievementBonus,
  checkAchievements,
  applyDiminishingReturns,
  computeSiegeForecast,
  rollAnomalies,
  buildAnomalyModifiers,
  generateRewardOptions,
  tickDownBuffs,
} from '../lib/game-logic.js';
import { processRaidOutcome } from '../lib/raid-outcome.js';

const FAUCET_COOLDOWN_MS = 5000;
const PASSIVE_TICK_MS = 60_000;

export interface SessionStats {
  startedAt: number;
  raidsWon: number;
  raidsLost: number;
  structuresBuilt: number;
  resourcesEarned: Resources;
  achievementsUnlocked: number;
}

export interface RaidSummary {
  won: boolean;
  raidType: 'attack' | 'defend';
  outcome: string;
  lootGained: Resources;
  lootLost: Resources;
  raidersKilled: number;
  raidersTotal: number;
  wallsDestroyed: number;
  archersActive: number;
  difficulty: number;
}

export interface BackgroundRaidResult {
  won: boolean;
  lootLost: Resources;
  defenseBonus: Resources;
  difficulty: number;
}

export interface OfflineReport {
  resources: Resources;
  raids: BackgroundRaidResult[];
  newAchievements: string[];
}


function simulateBackgroundRaids(save: GameSave, elapsedMs: number): { save: GameSave; results: BackgroundRaidResult[] } {
  if (save.keep.grid.structures.length < 3) return { save, results: [] };

  const raidCount = Math.min(
    Math.floor(elapsedMs / BACKGROUND_RAID_INTERVAL_MS),
    BACKGROUND_RAID_MAX,
  );
  if (raidCount === 0) return { save, results: [] };

  const results: BackgroundRaidResult[] = [];
  let current = save;

  for (let i = 0; i < raidCount; i++) {
    const totalRaids = current.progression.totalRaidsWon + current.progression.totalRaidsLost;
    const difficulty = raidDifficulty(totalRaids);
    const seed = `bg-${current.lastPlayedAtUnixMs}-${i}`;
    const probeCount = 3 + difficulty;
    const rng = simpleRng(current.lastPlayedAtUnixMs + i);
    const probeTypes = buildProbeTypes(probeCount, difficulty, rng);

    const replay = simulateRaid({
      probeCount,
      keepGrid: current.keep.grid,
      seed,
      probeTypes,
    });

    const lastEvent = replay.events[replay.events.length - 1];
    if (lastEvent?.type !== 'raid_end') continue;

    const won = lastEvent.outcome === 'defense_win';

    const lootLost = replay.events
      .filter((e): e is Extract<typeof e, { type: 'treasury_breach' }> => e.type === 'treasury_breach')
      .reduce(
        (sum, e) => ({
          gold: sum.gold + e.lootTaken.gold,
          wood: sum.wood + e.lootTaken.wood,
          stone: sum.stone + e.lootTaken.stone,
        }),
        { gold: 0, wood: 0, stone: 0 },
      );

    const archerKills = replay.events.filter(
      (e) => e.type === 'arrow_hit' && e.hpRemaining <= 0,
    ).length;

    const raidersKilled = replay.events.filter((e) => e.type === 'raider_destroyed').length;
    const killRatio = probeCount > 0 ? raidersKilled / probeCount : 0;
    const defenseBonus: Resources = won
      ? { gold: 10 + difficulty * 3, wood: 5 + difficulty * 2, stone: 5 + difficulty * 2 }
      : { gold: Math.floor(killRatio * difficulty * 2), wood: Math.floor(killRatio * difficulty), stone: Math.floor(killRatio * difficulty) };

    const afterLoss = {
      gold: Math.max(0, current.keep.resources.gold - lootLost.gold),
      wood: Math.max(0, current.keep.resources.wood - lootLost.wood),
      stone: Math.max(0, current.keep.resources.stone - lootLost.stone),
    };
    const updatedResources = capResources(addResources(afterLoss, defenseBonus));

    const newWinStreak = won ? current.progression.currentWinStreak + 1 : 0;
    const raidRecord = {
      id: seed,
      seed,
      rulesVersion: 1,
      attackerId: 'npc-bg',
      defenderKeepId: current.keep.id,
      startedAtUnixMs: current.lastPlayedAtUnixMs + i * BACKGROUND_RAID_INTERVAL_MS,
      resolvedAtUnixMs: current.lastPlayedAtUnixMs + (i + 1) * BACKGROUND_RAID_INTERVAL_MS,
      outcome: lastEvent.outcome,
      lootLost,
      lootGained: defenseBonus,
      replay,
    };

    current = {
      ...current,
      keep: { ...current.keep, resources: updatedResources },
      raidHistory: [...current.raidHistory.slice(-19), raidRecord],
      progression: {
        ...current.progression,
        totalRaidsWon: current.progression.totalRaidsWon + (won ? 1 : 0),
        totalRaidsLost: current.progression.totalRaidsLost + (won ? 0 : 1),
        currentWinStreak: newWinStreak,
        bestWinStreak: Math.max(current.progression.bestWinStreak, newWinStreak),
        totalRaidersKilledByArcher: current.progression.totalRaidersKilledByArcher + archerKills,
      },
    };

    results.push({ won, lootLost, defenseBonus, difficulty });
  }

  return { save: current, results };
}

export function useGameState(forceTutorial: boolean, dryRun?: boolean) {
  const [gameSave, setGameSave] = useState<GameSave | null>(null);
  const [cursor, setCursor] = useState<GridCoord>({ x: 8, y: 8 });
  const [structureIndex, setStructureIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [raidReplay, setRaidReplay] = useState<RaidReplay | null>(null);
  const [raidGrid, setRaidGrid] = useState<KeepGridState | null>(null);
  const [raidType, setRaidType] = useState<'attack' | 'defend' | null>(null);
  const sessionStartRef = useRef({
    time: Date.now(),
    raidsWon: 0,
    raidsLost: 0,
    structures: 0,
    resources: { gold: 0, wood: 0, stone: 0 } as Resources,
    achievements: 0,
  });
  const [raidSummary, setRaidSummary] = useState<RaidSummary | null>(null);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null);
  const [fragments, setFragments] = useState<DataFragment[]>([]);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFaucetTimeRef = useRef(0);
  const faucetUsesRef = useRef(0);
  const passiveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fragmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQuickRaidRef = useRef<{
    replay: RaidReplay;
    grid: KeepGridState;
    summary: RaidSummary;
  } | null>(null);
  const pendingAutoCollectRef = useRef<GridCoord | null>(null);
  const undoRef = useRef<{ save: GameSave; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [flowMultiplier, setFlowMultiplier] = useState(1.0);
  const codingEventTimesRef = useRef<number[]>([]);
  const [raidAnomalies, setRaidAnomalies] = useState<RaidAnomaly[]>([]);
  const [pendingRewards, setPendingRewards] = useState<RewardOption[] | null>(null);

  const updateFlowState = useCallback(() => {
    const now = Date.now();
    codingEventTimesRef.current.push(now);
    const cutoff = now - 30 * 60 * 1000;
    codingEventTimesRef.current = codingEventTimesRef.current.filter((t) => t > cutoff);
    const count = codingEventTimesRef.current.length;
    if (count >= 6) setFlowMultiplier(2.0);
    else if (count >= 3) setFlowMultiplier(1.5);
    else if (count >= 1) setFlowMultiplier(1.2);
    else setFlowMultiplier(1.0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 30 * 60 * 1000;
      codingEventTimesRef.current = codingEventTimesRef.current.filter((t) => t > cutoff);
      const count = codingEventTimesRef.current.length;
      if (count >= 6) setFlowMultiplier(2.0);
      else if (count >= 3) setFlowMultiplier(1.5);
      else if (count >= 1) setFlowMultiplier(1.2);
      else setFlowMultiplier(1.0);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const selectedStructure = ALL_STRUCTURE_KINDS[structureIndex];

  useCodingEvents((event) => {
    updateFlowState();
    setGameSave((prev) => {
      if (!prev) return prev;
      const updatedKeep = grantCodingEventResources(prev.keep, event);
      const updated = { ...prev, keep: updatedKeep, lastPlayedAtUnixMs: Date.now() };
      if (!dryRun) saveGame(updated);
      return updated;
    });
  });

  useEffect(() => {
    let save = loadGame();
    if (!save) {
      save = createNewGameSave(process.env.USER || process.env.USERNAME || 'Keeper');
    }
    save = ensureProgression(save);

    if (!save.lastPlayedAtUnixMs) {
      save = { ...save, lastPlayedAtUnixMs: save.savedAtUnixMs || Date.now() };
    }

    const elapsedMs = Date.now() - save.lastPlayedAtUnixMs;
    let offlineResources: Resources = { gold: 0, wood: 0, stone: 0 };
    let bgRaidResults: BackgroundRaidResult[] = [];

    // Passive income
    if (elapsedMs > PASSIVE_TICK_MS && save.keep.grid.structures.length > 0) {
      offlineResources = calculateOfflineResources(save.keep.grid, elapsedMs);
      if (offlineResources.gold > 0 || offlineResources.wood > 0 || offlineResources.stone > 0) {
        save = {
          ...save,
          keep: {
            ...save.keep,
            resources: capResources(addResources(save.keep.resources, offlineResources)),
          },
        };
      }
    }

    // Background raids
    if (elapsedMs > BACKGROUND_RAID_INTERVAL_MS) {
      const bgResult = simulateBackgroundRaids(save, elapsedMs);
      save = bgResult.save;
      bgRaidResults = bgResult.results;
    }

    // Check achievements
    const newAchievements = checkAchievements(save);
    if (newAchievements.length > 0) {
      save = {
        ...save,
        progression: {
          ...save.progression,
          achievements: [...save.progression.achievements, ...newAchievements],
        },
      };

      // Apply achievement bonuses
      for (const id of newAchievements) {
        const bonus = getAchievementBonus(id);
        if (bonus) {
          save = { ...save, keep: { ...save.keep, resources: addResources(save.keep.resources, bonus) } };
        }
      }
    }

    const hasOffline = offlineResources.gold > 0 || offlineResources.wood > 0 || offlineResources.stone > 0;
    if (hasOffline || bgRaidResults.length > 0 || newAchievements.length > 0) {
      setOfflineReport({ resources: offlineResources, raids: bgRaidResults, newAchievements });
    }

    save = { ...save, lastPlayedAtUnixMs: Date.now() };
    if (forceTutorial) save = { ...save, tutorialCompleted: false };

    sessionStartRef.current = {
      time: Date.now(),
      raidsWon: save.progression.totalRaidsWon,
      raidsLost: save.progression.totalRaidsLost,
      structures: save.keep.grid.structures.length,
      resources: { ...save.keep.resources },
      achievements: save.progression.achievements.length,
    };

    setGameSave(save);
    if (!dryRun) saveGame(save);
  }, []);

  // Passive income timer
  useEffect(() => {
    passiveTimerRef.current = setInterval(() => {
      setGameSave((prev) => {
        if (!prev || prev.keep.grid.structures.length === 0) return prev;
        let bonus = calculateOfflineResources(prev.keep.grid, PASSIVE_TICK_MS);
        if (hasUnlock(prev, 'passive_income_boost')) {
          bonus = { gold: Math.floor(bonus.gold * 1.5), wood: Math.floor(bonus.wood * 1.5), stone: Math.floor(bonus.stone * 1.5) };
        }
        if (bonus.gold === 0 && bonus.wood === 0 && bonus.stone === 0) return prev;
        const updated = {
          ...prev,
          keep: { ...prev.keep, resources: capResources(addResources(prev.keep.resources, bonus)) },
          lastPlayedAtUnixMs: Date.now(),
        };
        if (!dryRun) saveGame(updated);
        return updated;
      });
    }, PASSIVE_TICK_MS);
    return () => { if (passiveTimerRef.current) clearInterval(passiveTimerRef.current); };
  }, [dryRun]);

  // Fragment spawn/decay timer
  useEffect(() => {
    fragmentTimerRef.current = setInterval(() => {
      setFragments((prev) => {
        if (!gameSave) return prev;
        const rng = simpleRng(Date.now());
        const afterDecay = decayFragments(prev, Date.now());
        return spawnFragments(afterDecay, gameSave.keep.grid, Date.now(), rng);
      });
    }, FRAGMENT_SPAWN_INTERVAL_MS);
    return () => { if (fragmentTimerRef.current) clearInterval(fragmentTimerRef.current); };
  }, [gameSave]);

  useEffect(() => {
    const pos = pendingAutoCollectRef.current;
    if (!pos || !gameSave) return;
    pendingAutoCollectRef.current = null;
    const result = collectFragment(fragments, pos, gameSave.keep.grid);
    if (!result) return;
    setFragments(result.updatedFragments);
    const y = result.yield;
    const updated = {
      ...gameSave,
      keep: { ...gameSave.keep, resources: capResources(addResources(gameSave.keep.resources, y)) },
    };
    persist(updated);
    const parts: string[] = [];
    if (y.gold > 0) parts.push(`+${y.gold}${RESOURCE_ICONS.gold}`);
    if (y.wood > 0) parts.push(`+${y.wood}${RESOURCE_ICONS.wood}`);
    if (y.stone > 0) parts.push(`+${y.stone}${RESOURCE_ICONS.stone}`);
    const typeName = result.collected[0]?.type.replace('_', ' ') ?? 'fragment';
    const multi = result.collected.length > 1 ? ` (${result.collected.length}x)` : '';
    showMessage(`${parts.join(' ')} ${typeName}${multi}`);
  }, [cursor]);

  useEffect(() => {
    return () => { if (messageTimerRef.current) clearTimeout(messageTimerRef.current); };
  }, []);

  const persist = useCallback((save: GameSave) => {
    const newAch = checkAchievements(save);
    let updated = { ...save, lastPlayedAtUnixMs: Date.now() };
    if (newAch.length > 0) {
      updated = {
        ...updated,
        progression: { ...updated.progression, achievements: [...updated.progression.achievements, ...newAch] },
      };
      for (const id of newAch) {
        const bonus = getAchievementBonus(id);
        if (bonus) {
          updated = { ...updated, keep: { ...updated.keep, resources: addResources(updated.keep.resources, bonus) } };
        }
      }
    }
    setGameSave(updated);
    if (!dryRun) saveGame(updated);
    if (newAch.length > 0) {
      const names = newAch.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name || id);
      showMessage(`🏆 ${names.join(', ')}!`);
    }
  }, [dryRun]);

  const showMessage = useCallback((msg: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(msg);
    messageTimerRef.current = setTimeout(() => {
      setMessage('');
      messageTimerRef.current = null;
    }, 3000);
  }, []);

  const moveCursor = useCallback((dx: number, dy: number) => {
    setCursor((c) => {
      const next = {
        x: Math.max(0, Math.min(GRID_SIZE - 1, c.x + dx)),
        y: Math.max(0, Math.min(GRID_SIZE - 1, c.y + dy)),
      };
      pendingAutoCollectRef.current = next;
      return next;
    });
  }, []);

  const cycleStructure = useCallback((dir: number) => {
    setStructureIndex((i) => {
      const next = i + dir;
      if (next < 0) return ALL_STRUCTURE_KINDS.length - 1;
      if (next >= ALL_STRUCTURE_KINDS.length) return 0;
      return next;
    });
  }, []);

  const selectStructure = useCallback((index: number) => {
    if (index >= 0 && index < ALL_STRUCTURE_KINDS.length) setStructureIndex(index);
  }, []);

  const saveUndo = useCallback((save: GameSave) => {
    if (undoRef.current) clearTimeout(undoRef.current.timer);
    const timer = setTimeout(() => { undoRef.current = null; }, 10_000);
    undoRef.current = { save, timer };
  }, []);

  const placeAtCursor = useCallback(() => {
    if (!gameSave) return;
    const startLv = hasUnlock(gameSave, 'structures_lv2') ? 2 as const : undefined;
    const result = placeStructure(gameSave.keep, cursor, selectedStructure, startLv ? { startingLevel: startLv } : undefined);
    if (result.ok && result.keep) {
      saveUndo(gameSave);
      const updated = {
        ...gameSave,
        keep: result.keep,
        progression: { ...gameSave.progression, totalStructuresPlaced: gameSave.progression.totalStructuresPlaced + 1 },
      };
      persist(updated);
      showMessage(`Placed ${selectedStructure} [z undo]`);
    } else {
      showMessage(`!${result.reason}`);
    }
  }, [gameSave, cursor, selectedStructure, persist, showMessage, saveUndo]);

  const upgradeAtCursor = useCallback(() => {
    if (!gameSave) return;
    const result = upgradeStructure(gameSave.keep, cursor);
    if (result.ok && result.keep) {
      saveUndo(gameSave);
      persist({ ...gameSave, keep: result.keep });
      showMessage('Upgraded! [z undo]');
    } else {
      showMessage(`!${result.reason}`);
    }
  }, [gameSave, cursor, persist, showMessage, saveUndo]);

  const demolishAtCursor = useCallback(() => {
    if (!gameSave) return;
    const result = demolishStructure(gameSave.keep, cursor);
    if (result.ok && result.keep) {
      saveUndo(gameSave);
      persist({ ...gameSave, keep: result.keep });
      showMessage('Demolished (50% refund) [z undo]');
    } else {
      showMessage(`!${result.reason}`);
    }
  }, [gameSave, cursor, persist, showMessage]);

  const prepareRaidModifiers = useCallback((difficulty: number, rng: () => number): { anomalies: RaidAnomaly[]; modifiers: RaidModifiers } => {
    const anomalies = rollAnomalies(difficulty, rng);
    const buffs = gameSave?.activeBuffs ?? [];
    const modifiers = buildAnomalyModifiers(anomalies, buffs);
    setRaidAnomalies(anomalies);
    return { anomalies, modifiers };
  }, [gameSave]);

  const handlePostRaidBuffs = useCallback((save: GameSave): GameSave => {
    const current = save.activeBuffs ?? [];
    if (current.length === 0) return save;
    return { ...save, activeBuffs: tickDownBuffs(current) };
  }, []);

  const startAttackRaid = useCallback(() => {
    if (!gameSave) return;
    const totalRaids = gameSave.progression.totalRaidsWon + gameSave.progression.totalRaidsLost;
    const difficulty = raidDifficulty(totalRaids);
    const seed = `attack-${Date.now()}-${Math.random()}`;
    const npcKeep = generateNpcKeep(seed, difficulty);
    const probeCount = 3 + difficulty;
    const rng = simpleRng(Date.now());
    const { anomalies, modifiers } = prepareRaidModifiers(difficulty, rng);
    const bruteMult = modifiers.bruteChanceMult ?? 1;
    const probeTypes = buildProbeTypes(probeCount, difficulty, rng, bruteMult);
    const replay = simulateRaid({ probeCount, keepGrid: npcKeep.grid, seed, probeTypes, modifiers });
    setRaidReplay(replay);
    setRaidGrid(npcKeep.grid);
    setRaidType('attack');

    const result = processRaidOutcome({
      gameSave, replay, raidType: 'attack', seed, difficulty, probeCount,
      attackerId: gameSave.player.id, defenderKeepId: npcKeep.id, defenderGrid: npcKeep.grid,
    });
    if (result) {
      setRaidSummary(result.summary);
      const updated = handlePostRaidBuffs(result.updatedSave);
      if (result.won) {
        const rewardRng = simpleRng(Date.now() + 1);
        setPendingRewards(generateRewardOptions(difficulty, rewardRng));
      }
      persist(updated);
    }
  }, [gameSave, persist, prepareRaidModifiers, handlePostRaidBuffs]);

  const startDefendRaid = useCallback(() => {
    if (!gameSave) return;
    const totalRaids = gameSave.progression.totalRaidsWon + gameSave.progression.totalRaidsLost;
    const difficulty = raidDifficulty(totalRaids);
    const seed = `defend-${Date.now()}-${Math.random()}`;
    const probeCount = 3 + difficulty;
    const rng = simpleRng(Date.now());
    const { anomalies, modifiers } = prepareRaidModifiers(difficulty, rng);
    const bruteMult = modifiers.bruteChanceMult ?? 1;
    const probeTypes = buildProbeTypes(probeCount, difficulty, rng, bruteMult);
    const replay = simulateRaid({ probeCount, keepGrid: gameSave.keep.grid, seed, probeTypes, modifiers });
    setRaidReplay(replay);
    setRaidGrid(gameSave.keep.grid);
    setRaidType('defend');

    const result = processRaidOutcome({
      gameSave, replay, raidType: 'defend', seed, difficulty, probeCount,
      attackerId: 'npc', defenderKeepId: gameSave.keep.id,
    });
    if (result) {
      setRaidSummary(result.summary);
      const updated = handlePostRaidBuffs(result.updatedSave);
      if (result.won) {
        const rewardRng = simpleRng(Date.now() + 1);
        setPendingRewards(generateRewardOptions(difficulty, rewardRng));
      }
      persist(updated);
    }
  }, [gameSave, persist, prepareRaidModifiers, handlePostRaidBuffs]);

  const quickDefend = useCallback(() => {
    if (!gameSave) return;
    const totalRaids = gameSave.progression.totalRaidsWon + gameSave.progression.totalRaidsLost;
    const difficulty = raidDifficulty(totalRaids);
    const seed = `quick-${Date.now()}-${Math.random()}`;
    const probeCount = 3 + difficulty;
    const rng = simpleRng(Date.now());
    const { modifiers } = prepareRaidModifiers(difficulty, rng);
    const bruteMult = modifiers.bruteChanceMult ?? 1;
    const probeTypes = buildProbeTypes(probeCount, difficulty, rng, bruteMult);
    const replay = simulateRaid({ probeCount, keepGrid: gameSave.keep.grid, seed, probeTypes, modifiers });

    const result = processRaidOutcome({
      gameSave, replay, raidType: 'defend', seed, difficulty, probeCount,
      attackerId: 'npc', defenderKeepId: gameSave.keep.id,
    });
    if (result) {
      const updated = handlePostRaidBuffs(result.updatedSave);
      persist(updated);
      lastQuickRaidRef.current = { replay, grid: gameSave.keep.grid, summary: result.summary };

      if (result.won) {
        const b = result.lootGained;
        const rewardRng = simpleRng(Date.now() + 1);
        setPendingRewards(generateRewardOptions(difficulty, rewardRng));
        showMessage(`Defense WIN! +${b.gold}${RESOURCE_ICONS.gold} +${b.wood}${RESOURCE_ICONS.wood} +${b.stone}${RESOURCE_ICONS.stone}  [v] view`);
      } else {
        const total = result.lootLost.gold + result.lootLost.wood + result.lootLost.stone;
        showMessage(`Defense BREACH! Lost ${total} res (+${result.lootGained.gold}${RESOURCE_ICONS.gold} salvage)  [v] view`);
      }
    }
  }, [gameSave, persist, showMessage, prepareRaidModifiers, handlePostRaidBuffs]);

  const watchLastRaid = useCallback((): boolean => {
    const last = lastQuickRaidRef.current;
    if (!last) return false;
    setRaidReplay(last.replay);
    setRaidGrid(last.grid);
    setRaidType('defend');
    setRaidSummary(last.summary);
    lastQuickRaidRef.current = null;
    return true;
  }, []);

  const collectAtCursor = useCallback(() => {
    if (!gameSave) return;
    const result = collectFragment(fragments, cursor, gameSave.keep.grid);
    if (!result) return;
    setFragments(result.updatedFragments);
    const y = result.yield;
    const updated = {
      ...gameSave,
      keep: { ...gameSave.keep, resources: capResources(addResources(gameSave.keep.resources, y)) },
    };
    persist(updated);
    const parts: string[] = [];
    if (y.gold > 0) parts.push(`+${y.gold}${RESOURCE_ICONS.gold}`);
    if (y.wood > 0) parts.push(`+${y.wood}${RESOURCE_ICONS.wood}`);
    if (y.stone > 0) parts.push(`+${y.stone}${RESOURCE_ICONS.stone}`);
    const typeName = result.collected[0]?.type.replace('_', ' ') ?? 'fragment';
    const multi = result.collected.length > 1 ? ` (${result.collected.length}x)` : '';
    showMessage(`${parts.join(' ')} ${typeName}${multi}`);
  }, [gameSave, fragments, cursor, persist, showMessage]);

  const watchRaidRecord = useCallback((record: { replay: RaidReplay; attackerId: string; defenderKeepId: string; defenderGrid?: KeepGridState }): boolean => {
    if (!gameSave) return false;
    const isDefense = record.attackerId !== gameSave.player.id;
    setRaidReplay(record.replay);
    setRaidGrid(isDefense ? gameSave.keep.grid : (record.defenderGrid ?? gameSave.keep.grid));
    setRaidType(isDefense ? 'defend' : 'attack');
    setRaidSummary(null);
    return true;
  }, [gameSave]);

  const clearRaid = useCallback(() => {
    setRaidReplay(null);
    setRaidGrid(null);
    setRaidType(null);
    setRaidSummary(null);
  }, []);

  const completeTutorial = useCallback(() => {
    if (!gameSave) return;
    persist({ ...gameSave, tutorialCompleted: true });
  }, [gameSave, persist]);

  const grantSimResources = useCallback(() => {
    if (!gameSave) return;
    const now = Date.now();
    const elapsed = now - lastFaucetTimeRef.current;
    if (elapsed < FAUCET_COOLDOWN_MS) {
      const remaining = Math.ceil((FAUCET_COOLDOWN_MS - elapsed) / 1000);
      showMessage(`Cooldown: ${remaining}s remaining`);
      return;
    }
    lastFaucetTimeRef.current = now;
    faucetUsesRef.current++;
    updateFlowState();

    const event = simulateFaucetEvent();
    const extraFaucet = hasUnlock(gameSave, 'extra_faucet') ? 3 : 0;
    const grants = applyDiminishingReturns({ ...event.grants }, Math.max(0, faucetUsesRef.current - extraFaucet));

    const updatedKeep = grantCodingEventResources(gameSave.keep, { ...event, grants });
    persist({ ...gameSave, keep: updatedKeep });
    const effectiveBase = FAUCET_BASE_USES + extraFaucet;
    const dimNote = faucetUsesRef.current > effectiveBase ? ' (diminished)' : '';
    showMessage(`+${grants.gold}${RESOURCE_ICONS.gold} +${grants.wood}${RESOURCE_ICONS.wood} +${grants.stone}${RESOURCE_ICONS.stone} (${KINGDOM_EVENT_NAMES[event.type] ?? event.type})${dimNote}`);
  }, [gameSave, persist, showMessage]);

  const jumpToCoord = useCallback((x: number, y: number) => {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) setCursor({ x, y });
  }, []);

  const jumpToNextStructure = useCallback((dir: 1 | -1) => {
    if (!gameSave || gameSave.keep.grid.structures.length === 0) return;
    const structures = gameSave.keep.grid.structures;
    const currentKey = `${cursor.x},${cursor.y}`;
    const currentIdx = structures.findIndex((s) => `${s.pos.x},${s.pos.y}` === currentKey);
    let nextIdx = currentIdx === -1 ? 0 : currentIdx + dir;
    if (nextIdx < 0) nextIdx = structures.length - 1;
    if (nextIdx >= structures.length) nextIdx = 0;
    const next = structures[nextIdx];
    setCursor({ x: next.pos.x, y: next.pos.y });
  }, [gameSave, cursor]);

  const undoLastAction = useCallback(() => {
    if (!undoRef.current) {
      showMessage('!Nothing to undo');
      return;
    }
    const prev = undoRef.current.save;
    clearTimeout(undoRef.current.timer);
    undoRef.current = null;
    persist(prev);
    showMessage('Undone!');
  }, [persist, showMessage]);

  const saveDailyChallengeScore = useCallback((dateKey: string, wavesCleared: number, score: number) => {
    if (!gameSave) return;
    persist({
      ...gameSave,
      progression: {
        ...gameSave.progression,
        dailyChallenges: {
          ...gameSave.progression.dailyChallenges,
          [dateKey]: { wavesCleared, score },
        },
      },
    });
  }, [gameSave, persist]);

  const clearOfflineReport = useCallback(() => { setOfflineReport(null); }, []);

  const applyExternalSave = useCallback((save: GameSave) => {
    if (!dryRun) saveGame(save);
    setGameSave(save);
    faucetUsesRef.current = 0;
  }, [dryRun]);

  const claimReward = useCallback((rewardId: string) => {
    if (!gameSave || !pendingRewards) return;
    const reward = pendingRewards.find((r) => r.id === rewardId);
    if (!reward) return;

    let updated = { ...gameSave };
    if (reward.type === 'resources' && reward.resources) {
      updated = {
        ...updated,
        keep: {
          ...updated.keep,
          resources: capResources(addResources(updated.keep.resources, reward.resources)),
        },
      };
      showMessage(`Claimed ${reward.name}!`);
    } else if (reward.type === 'buff' && reward.buff) {
      const existing = updated.activeBuffs ?? [];
      updated = { ...updated, activeBuffs: [...existing, { ...reward.buff }] };
      showMessage(`${reward.buff.name} active for ${reward.buff.raidsRemaining} raids!`);
    }

    setPendingRewards(null);
    persist(updated);
  }, [gameSave, pendingRewards, persist, showMessage]);

  const dismissRewards = useCallback(() => { setPendingRewards(null); }, []);

  const structureAtCursor = gameSave?.keep.grid.structures.find(
    (s) => s.pos.x === cursor.x && s.pos.y === cursor.y,
  ) ?? null;

  const activeSynergies = gameSave ? evaluateSynergies(gameSave.keep.grid) : [];
  const synergyStructureIds = new Set(activeSynergies.flatMap((s) => s.affectedStructureIds));

  const siegeForecast = gameSave ? (() => {
    const totalRaids = gameSave.progression.totalRaidsWon + gameSave.progression.totalRaidsLost;
    const watchtowerCount = gameSave.keep.grid.structures.filter((s) => s.kind === 'watchtower').length;
    const fc = computeSiegeForecast(gameSave.keep.id, totalRaids, watchtowerCount);
    return watchtowerCount >= 2 ? fc.detailed : fc.vague;
  })() : undefined;

  return {
    gameSave,
    cursor,
    selectedStructure,
    structureAtCursor,
    message,
    fragments,
    raidReplay,
    raidGrid,
    raidType,
    raidSummary,
    offlineReport,
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
    getSessionStats: (): SessionStats | null => {
      if (!gameSave) return null;
      const s = sessionStartRef.current;
      return {
        startedAt: s.time,
        raidsWon: gameSave.progression.totalRaidsWon - s.raidsWon,
        raidsLost: gameSave.progression.totalRaidsLost - s.raidsLost,
        structuresBuilt: gameSave.keep.grid.structures.length - s.structures,
        resourcesEarned: {
          gold: Math.max(0, gameSave.keep.resources.gold - s.resources.gold),
          wood: Math.max(0, gameSave.keep.resources.wood - s.resources.wood),
          stone: Math.max(0, gameSave.keep.resources.stone - s.resources.stone),
        },
        achievementsUnlocked: gameSave.progression.achievements.length - s.achievements,
      };
    },
  };
}
