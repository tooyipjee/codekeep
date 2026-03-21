import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RaidReplay, KeepGridState, GridCoord, RaidTickEvent, Resources } from '@codekeep/shared';
import { GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL, RESOURCE_ICONS } from '@codekeep/shared';

interface RaidSummary {
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

interface RaidViewProps {
  replay: RaidReplay;
  keepGrid: KeepGridState;
  raidType: 'attack' | 'defend';
  summary?: RaidSummary;
  initialSpeed?: SpeedMultiplier;
  onSpeedChange?: (speed: SpeedMultiplier) => void;
  onDone: () => void;
}

type SpeedMultiplier = 1 | 2 | 4 | 8;

interface RaiderState {
  id: number;
  pos: GridCoord;
  alive: boolean;
  stunned: boolean;
}

function formatLootLine(loot: Resources, sign: '+' | '-'): string {
  const parts: string[] = [];
  if (loot.gold > 0) parts.push(`${sign}${loot.gold}${RESOURCE_ICONS.gold}`);
  if (loot.wood > 0) parts.push(`${sign}${loot.wood}${RESOURCE_ICONS.wood}`);
  if (loot.stone > 0) parts.push(`${sign}${loot.stone}${RESOURCE_ICONS.stone}`);
  return parts.join(' ');
}

const STRUCTURE_COLORS: Record<string, string> = {
  wall: 'white',
  trap: 'magenta',
  treasury: 'yellow',
  ward: 'cyan',
  watchtower: 'green',
  archerTower: 'redBright',
};

export function RaidView({ replay, keepGrid, raidType, summary, initialSpeed, onSpeedChange, onDone }: RaidViewProps) {
  const [currentTick, setCurrentTick] = useState(0);
  const [speed, setSpeedState] = useState<SpeedMultiplier>(initialSpeed ?? 2);

  const setSpeed = useCallback((s: SpeedMultiplier) => {
    setSpeedState(s);
    onSpeedChange?.(s);
  }, [onSpeedChange]);
  const [paused, setPaused] = useState(false);
  const [raiders, setRaiders] = useState<Map<number, RaiderState>>(new Map());
  const [logs, setLogs] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const lastProcessedTickRef = useRef(0);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      onDone();
      return;
    }
    if (input === 'p' || input === ' ') {
      setPaused((p) => !p);
      return;
    }
    if (input === '1') setSpeed(1);
    if (input === '2') setSpeed(2);
    if (input === '4') setSpeed(4);
    if (input === '8') setSpeed(8);
    if (input === 'n' || key.return) {
      setCurrentTick(replay.maxTicks);
    }
  });

  useEffect(() => {
    if (paused || outcome) return;

    const interval = setInterval(() => {
      setCurrentTick((t) => {
        const next = t + 1;
        if (next > replay.maxTicks) {
          clearInterval(interval);
          return t;
        }
        return next;
      });
    }, (1000 / replay.tickRateHz) / speed);

    return () => clearInterval(interval);
  }, [paused, speed, outcome, replay]);

  useEffect(() => {
    if (currentTick <= lastProcessedTickRef.current) return;

    const eventsInRange = replay.events.filter(
      (e) => e.t > lastProcessedTickRef.current && e.t <= currentTick,
    );
    const newLogs: string[] = [];

    setRaiders((prev) => {
      const newRaiders = new Map(prev);
      for (const event of eventsInRange) {
        switch (event.type) {
          case 'raider_spawn':
            newRaiders.set(event.probeId, {
              id: event.probeId,
              pos: { ...event.pos },
              alive: true,
              stunned: false,
            });
            break;
          case 'raider_move': {
            const p = newRaiders.get(event.probeId);
            if (p) {
              p.pos = { ...event.to };
              p.stunned = false;
            }
            break;
          }
          case 'raider_stunned': {
            const p = newRaiders.get(event.probeId);
            if (p) p.stunned = true;
            break;
          }
          case 'raider_destroyed': {
            const p = newRaiders.get(event.probeId);
            if (p) p.alive = false;
            break;
          }
          default:
            break;
        }
      }
      return newRaiders;
    });

    for (const event of eventsInRange) {
      switch (event.type) {
        case 'raider_spawn':
          newLogs.push(`Raider ${event.probeId} enters from ${event.edge}`);
          break;
        case 'raider_stunned':
          newLogs.push(`Raider ${event.probeId} STUNNED ${event.stunTicks}t`);
          break;
        case 'wall_damaged':
          newLogs.push(
            event.destroyed
              ? `Wall DESTROYED!`
              : `Wall hit (${event.hpRemaining} HP)`,
          );
          break;
        case 'arrow_hit':
          if (event.hpRemaining <= 0) {
            newLogs.push(`Archer slew raider ${event.probeId}!`);
          } else {
            newLogs.push(
              `Arrow hit raider ${event.probeId} (-${event.damage}, ${event.hpRemaining} HP)`,
            );
          }
          break;
        case 'treasury_breach': {
          const loot = formatLootLine(event.lootTaken, '');
          const verb = raidType === 'attack' ? 'Looted' : 'Lost';
          newLogs.push(`TREASURY BREACHED! ${verb} ${loot}`);
          break;
        }
        case 'raider_destroyed': {
          const killByArrow = eventsInRange.some(
            (e): e is Extract<RaidTickEvent, { type: 'arrow_hit' }> =>
              e.type === 'arrow_hit' && e.probeId === event.probeId && e.hpRemaining <= 0 && e.t === event.t,
          );
          if (!killByArrow) {
            newLogs.push(`Raider ${event.probeId} eliminated`);
          }
          break;
        }
        case 'raid_end': {
          const outcomeText =
            event.outcome === 'defense_win'
              ? (raidType === 'defend' ? 'DEFENSE VICTORY!' : 'ATTACK FAILED — The keep held')
              : event.outcome === 'partial_breach'
              ? (raidType === 'defend' ? 'PARTIAL BREACH — Some supplies lost' : 'PARTIAL SUCCESS — Some loot gained')
              : (raidType === 'defend' ? 'FULL BREACH — Major losses!' : 'FULL SUCCESS — Major loot!');
          setOutcome(outcomeText);
          newLogs.push(outcomeText);
          break;
        }
        default:
          break;
      }
    }

    lastProcessedTickRef.current = currentTick;
    if (newLogs.length > 0) {
      setLogs((prev) => [...prev.slice(-8), ...newLogs]);
    }
  }, [currentTick, raidType, replay]);

  const structureMap = new Map<string, typeof keepGrid.structures[number]>();
  for (const s of keepGrid.structures) {
    structureMap.set(`${s.pos.x},${s.pos.y}`, s);
  }

  const raiderMap = new Map<string, RaiderState>();
  for (const [, p] of raiders) {
    if (p.alive) {
      raiderMap.set(`${p.pos.x},${p.pos.y}`, p);
    }
  }

  const gridLines: React.ReactNode[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const cells: React.ReactNode[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`;
      const raider = raiderMap.get(key);
      const structure = structureMap.get(key);

      if (raider) {
        cells.push(
          <Text key={x} color={raider.stunned ? 'cyan' : 'red'} bold>
            {raider.stunned ? '◊ ' : '● '}
          </Text>,
        );
      } else if (structure) {
        const sym = STRUCTURE_SYMBOLS[structure.kind];
        cells.push(
          <Text key={x} color={STRUCTURE_COLORS[structure.kind] || 'white'}>
            {sym + ' '}
          </Text>,
        );
      } else {
        cells.push(
          <Text key={x} dimColor>
            {EMPTY_CELL_SYMBOL + ' '}
          </Text>,
        );
      }
    }
    gridLines.push(
      <Box key={y}>{cells}</Box>,
    );
  }

  const raidLabel = raidType === 'defend' ? '⚔ DEFENDING YOUR KEEP' : '⚔ ATTACKING NPC KEEP';

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="row" gap={2}>
        <Text bold color={raidType === 'defend' ? 'red' : 'green'}>{raidLabel}</Text>
        <Text>Tick: {currentTick}/{replay.maxTicks}</Text>
        <Text>Speed: {speed}x</Text>
        <Text dimColor>{paused ? '[PAUSED]' : ''}</Text>
      </Box>
      <Text> </Text>
      <Box flexDirection="row">
        <Box flexDirection="column">
          {gridLines}
        </Box>
        <Box flexDirection="column" marginLeft={2} width={34}>
          <Text bold>Battle Log</Text>
          {(() => {
            const visibleLogs = logs.slice(-10);
            return visibleLogs.map((log, i) => (
              <Text key={i} dimColor={i < Math.max(0, visibleLogs.length - 3)}>
                {log}
              </Text>
            ));
          })()}
        </Box>
      </Box>
      <Text> </Text>
      {outcome ? (
        <Box flexDirection="column">
          <Text bold color={outcome.includes('VICTORY') || outcome.includes('SUCCESS') ? 'green' : 'red'}>
            {outcome}
          </Text>
          {summary && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>═══ Raid Summary ═══</Text>
              <Text>Difficulty: Lv.{summary.difficulty}  Raiders: {summary.raidersKilled}/{summary.raidersTotal} slain</Text>
              <Text>Walls destroyed: {summary.wallsDestroyed}  Archer towers: {summary.archersActive}</Text>
              {summary.lootGained.gold + summary.lootGained.wood + summary.lootGained.stone > 0 && (
                <Text color="green">Resources gained: {formatLootLine(summary.lootGained, '+')}</Text>
              )}
              {summary.lootLost.gold + summary.lootLost.wood + summary.lootLost.stone > 0 && (
                <Text color="red">Resources lost: {formatLootLine(summary.lootLost, '-')}</Text>
              )}
            </Box>
          )}
          <Text dimColor>Press q to return</Text>
        </Box>
      ) : (
        <Text dimColor>p pause  1/2/4/8 speed  n/↵ skip  q back</Text>
      )}
    </Box>
  );
}
