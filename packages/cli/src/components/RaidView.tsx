import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RaidReplay, KeepGridState, GridCoord, RaidTickEvent, Resources, ProbeType, PlacedStructure } from '@codekeep/shared';
import { GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL, RESOURCE_ICONS, RAIDER_TYPES, WALL_HP } from '@codekeep/shared';

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

interface RaiderDisplay {
  id: number;
  pos: GridCoord;
  alive: boolean;
  stunned: boolean;
  hp: number;
  maxHp: number;
  raiderType: ProbeType;
}

interface WallDisplay {
  structureId: string;
  pos: GridCoord;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

interface VisualEffect {
  pos: GridCoord;
  char: string;
  color: string;
  bold?: boolean;
  expiresAtTick: number;
}

const RAIDER_CHARS: Record<string, string> = {
  raider: 'R',
  scout: 'S',
  brute: 'B',
};

function hpColor(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.6) return 'green';
  if (pct > 0.3) return 'yellow';
  return 'red';
}

function wallColor(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.6) return 'white';
  if (pct > 0.3) return 'yellow';
  return 'red';
}

function formatLootLine(loot: Resources, sign: '+' | '-'): string {
  const parts: string[] = [];
  if (loot.gold > 0) parts.push(`${sign}${loot.gold}${RESOURCE_ICONS.gold}`);
  if (loot.wood > 0) parts.push(`${sign}${loot.wood}${RESOURCE_ICONS.wood}`);
  if (loot.stone > 0) parts.push(`${sign}${loot.stone}${RESOURCE_ICONS.stone}`);
  return parts.join(' ');
}

function hpBar(hp: number, maxHp: number, width: number = 6): string {
  const filled = Math.round((hp / maxHp) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
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
  const [raiders, setRaiders] = useState<Map<number, RaiderDisplay>>(new Map());
  const [walls, setWalls] = useState<Map<string, WallDisplay>>(() => {
    const m = new Map<string, WallDisplay>();
    for (const s of keepGrid.structures) {
      if (s.kind === 'wall') {
        const maxHp = WALL_HP[s.level];
        m.set(s.id, { structureId: s.id, pos: { ...s.pos }, hp: maxHp, maxHp, destroyed: false });
      }
    }
    return m;
  });
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [breachedTreasuries, setBreachedTreasuries] = useState<Set<string>>(new Set());
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
    const newEffects: VisualEffect[] = [];

    setRaiders((prev) => {
      const newRaiders = new Map(prev);
      for (const event of eventsInRange) {
        switch (event.type) {
          case 'raider_spawn': {
            const rType = event.raiderType ?? 'raider';
            const mHp = event.maxHp ?? RAIDER_TYPES[rType].hp;
            newRaiders.set(event.probeId, {
              id: event.probeId,
              pos: { ...event.pos },
              alive: true,
              stunned: false,
              hp: mHp,
              maxHp: mHp,
              raiderType: rType,
            });
            break;
          }
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
          case 'arrow_hit': {
            const p = newRaiders.get(event.probeId);
            if (p) {
              p.hp = Math.max(0, event.hpRemaining);
            }
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

    setWalls((prev) => {
      const newWalls = new Map(prev);
      for (const event of eventsInRange) {
        if (event.type === 'wall_damaged') {
          const w = newWalls.get(event.structureId);
          if (w) {
            w.hp = Math.max(0, event.hpRemaining);
            w.destroyed = event.destroyed;
          }
        }
      }
      return newWalls;
    });

    for (const event of eventsInRange) {
      switch (event.type) {
        case 'raider_spawn': {
          const rType = event.raiderType ?? 'raider';
          const badge = RAIDER_CHARS[rType] ?? 'R';
          newLogs.push(`${badge} Raider ${event.probeId + 1} enters from ${event.edge}`);
          newEffects.push({
            pos: { ...event.pos },
            char: '※',
            color: 'yellowBright',
            bold: true,
            expiresAtTick: currentTick + 2,
          });
          break;
        }
        case 'raider_stunned': {
          newLogs.push(`⚡ Raider ${event.probeId + 1} STUNNED ${event.stunTicks}t`);
          newEffects.push({
            pos: { ...event.pos },
            char: '✧',
            color: 'cyanBright',
            bold: true,
            expiresAtTick: currentTick + 3,
          });
          break;
        }
        case 'wall_damaged': {
          if (event.destroyed) {
            newLogs.push(`💥 Wall DESTROYED!`);
            const w = walls.get(event.structureId);
            if (w) {
              newEffects.push({
                pos: { ...w.pos },
                char: '✗',
                color: 'redBright',
                bold: true,
                expiresAtTick: currentTick + 4,
              });
            }
          } else {
            newLogs.push(`⚔ Wall hit (${event.hpRemaining} HP)`);
          }
          break;
        }
        case 'arrow_hit': {
          const raider = raiders.get(event.probeId);
          const archerStruct = keepGrid.structures.find(s => s.id === event.archerId);
          if (archerStruct && raider) {
            newEffects.push({
              pos: { ...raider.pos },
              char: '†',
              color: 'redBright',
              bold: true,
              expiresAtTick: currentTick + 2,
            });
          }
          if (event.hpRemaining <= 0) {
            newLogs.push(`🏹 Archer slew raider ${event.probeId + 1}!`);
            if (raider) {
              newEffects.push({
                pos: { ...raider.pos },
                char: '✖',
                color: 'redBright',
                bold: true,
                expiresAtTick: currentTick + 4,
              });
            }
          } else {
            newLogs.push(
              `🏹 Arrow hit raider ${event.probeId + 1} (-${event.damage} → ${event.hpRemaining} HP)`,
            );
          }
          break;
        }
        case 'treasury_breach': {
          const loot = formatLootLine(event.lootTaken, '');
          const verb = raidType === 'attack' ? 'Looted' : 'Lost';
          newLogs.push(`💰 TREASURY BREACHED! ${verb} ${loot}`);
          setBreachedTreasuries(prev => new Set([...prev, event.structureId]));
          const ts = keepGrid.structures.find(s => s.id === event.structureId);
          if (ts) {
            newEffects.push({
              pos: { ...ts.pos },
              char: '⚡',
              color: 'yellowBright',
              bold: true,
              expiresAtTick: currentTick + 5,
            });
          }
          break;
        }
        case 'raider_destroyed': {
          const killByArrow = eventsInRange.some(
            (e): e is Extract<RaidTickEvent, { type: 'arrow_hit' }> =>
              e.type === 'arrow_hit' && e.probeId === event.probeId && e.hpRemaining <= 0 && e.t === event.t,
          );
          if (!killByArrow) {
            newLogs.push(`💀 Raider ${event.probeId + 1} eliminated`);
          }
          break;
        }
        case 'raid_end': {
          const outcomeText =
            event.outcome === 'defense_win'
              ? (raidType === 'defend' ? 'DEFENSE VICTORY — All raiders defeated!' : 'ATTACK FAILED — The keep held strong')
              : event.outcome === 'partial_breach'
              ? (raidType === 'defend' ? 'PARTIAL BREACH — Raiders stole some supplies' : 'PARTIAL SUCCESS — Some loot seized')
              : (raidType === 'defend' ? 'FULL BREACH — Major losses!' : 'FULL SUCCESS — Major plunder!');
          setOutcome(outcomeText);
          newLogs.push(outcomeText);
          break;
        }
        default:
          break;
      }
    }

    setEffects(prev => [...prev.filter(e => e.expiresAtTick > currentTick), ...newEffects]);

    lastProcessedTickRef.current = currentTick;
    if (newLogs.length > 0) {
      setLogs((prev) => [...prev.slice(-10), ...newLogs]);
    }
  }, [currentTick, raidType, replay, keepGrid, walls, raiders]);

  const structureMap = new Map<string, PlacedStructure>();
  for (const s of keepGrid.structures) {
    structureMap.set(`${s.pos.x},${s.pos.y}`, s);
  }

  const raiderMap = new Map<string, RaiderDisplay>();
  for (const [, p] of raiders) {
    if (p.alive) {
      raiderMap.set(`${p.pos.x},${p.pos.y}`, p);
    }
  }

  const wallMap = new Map<string, WallDisplay>();
  for (const [, w] of walls) {
    wallMap.set(`${w.pos.x},${w.pos.y}`, w);
  }

  const effectMap = new Map<string, VisualEffect>();
  for (const e of effects) {
    const k = `${e.pos.x},${e.pos.y}`;
    if (!effectMap.has(k) || e.expiresAtTick > (effectMap.get(k)?.expiresAtTick ?? 0)) {
      effectMap.set(k, e);
    }
  }

  const colHeader = '  ' + Array.from({ length: GRID_SIZE }, (_, i) => i.toString(16).toUpperCase() + ' ').join('');
  const gridLines: React.ReactNode[] = [
    <Text key="hdr" dimColor>{colHeader}</Text>,
  ];

  for (let y = 0; y < GRID_SIZE; y++) {
    const cells: React.ReactNode[] = [
      <Text key="lbl" dimColor>{y.toString(16).toUpperCase() + ' '}</Text>,
    ];
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`;
      const raider = raiderMap.get(key);
      const structure = structureMap.get(key);
      const wall = wallMap.get(key);
      const effect = effectMap.get(key);

      if (effect && !raider) {
        cells.push(
          <Text key={x} color={effect.color} bold={effect.bold}>
            {effect.char + ' '}
          </Text>,
        );
      } else if (raider) {
        const ch = raider.stunned
          ? '◊'
          : RAIDER_CHARS[raider.raiderType] ?? '●';
        const col = raider.stunned ? 'cyan' : hpColor(raider.hp, raider.maxHp);
        cells.push(
          <Text key={x} color={col} bold>
            {ch + ' '}
          </Text>,
        );
      } else if (structure) {
        if (wall && !wall.destroyed) {
          const col = wallColor(wall.hp, wall.maxHp);
          cells.push(
            <Text key={x} color={col} bold={wall.hp > wall.maxHp * 0.6}>
              {'# '}
            </Text>,
          );
        } else if (wall && wall.destroyed) {
          cells.push(
            <Text key={x} color="red" dimColor>
              {'x '}
            </Text>,
          );
        } else if (breachedTreasuries.has(structure.id)) {
          cells.push(
            <Text key={x} color="red" bold>
              {'$ '}
            </Text>,
          );
        } else {
          const sym = STRUCTURE_SYMBOLS[structure.kind];
          cells.push(
            <Text key={x} color={STRUCTURE_COLORS[structure.kind] || 'white'}>
              {sym + ' '}
            </Text>,
          );
        }
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

  const aliveRaiders = Array.from(raiders.values()).filter(r => r.alive);
  const deadRaiders = Array.from(raiders.values()).filter(r => !r.alive);

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
        <Box flexDirection="column" marginLeft={2} width={38}>
          {aliveRaiders.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold>Raiders</Text>
              {aliveRaiders.map(r => (
                <Box key={r.id}>
                  <Text color={hpColor(r.hp, r.maxHp)} bold>
                    {RAIDER_CHARS[r.raiderType]}
                    {r.id + 1}
                  </Text>
                  <Text> </Text>
                  <Text color={hpColor(r.hp, r.maxHp)}>
                    {hpBar(r.hp, r.maxHp)}
                  </Text>
                  <Text dimColor> {r.hp}/{r.maxHp}</Text>
                  {r.stunned && <Text color="cyan"> STUN</Text>}
                </Box>
              ))}
              {deadRaiders.length > 0 && (
                <Text dimColor>  {deadRaiders.length} slain</Text>
              )}
            </Box>
          )}
          <Text bold>Battle Log</Text>
          {(() => {
            const visibleLogs = logs.slice(-10);
            return visibleLogs.map((log, i) => (
              <Text key={i} dimColor={i < Math.max(0, visibleLogs.length - 3)} wrap="truncate">
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
        <Box flexDirection="column">
          <Text dimColor>p pause  1/2/4/8 speed  n/↵ skip  q back</Text>
          <Text dimColor>
            <Text color="green" bold>R</Text>=Raider  <Text color="yellow" bold>S</Text>=Scout  <Text color="red" bold>B</Text>=Brute  <Text color="cyan">◊</Text>=Stunned  <Text color="red">✖</Text>=Kill  <Text color="redBright">†</Text>=Arrow
          </Text>
        </Box>
      )}
    </Box>
  );
}
