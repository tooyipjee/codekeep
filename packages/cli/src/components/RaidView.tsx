import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RaidReplay, KeepGridState, GridCoord, RaidTickEvent, Resources } from '@codekeep/shared';
import { GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL } from '@codekeep/shared';

interface RaidSummary {
  won: boolean;
  raidType: 'attack' | 'defend';
  outcome: string;
  lootGained: Resources;
  lootLost: Resources;
  probesKilled: number;
  probesTotal: number;
  firewallsDestroyed: number;
  scannersActive: number;
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

interface ProbeState {
  id: number;
  pos: GridCoord;
  alive: boolean;
  stunned: boolean;
}

const STRUCTURE_COLORS: Record<string, string> = {
  firewall: 'white',
  honeypot: 'magenta',
  dataVault: 'yellow',
  encryptionNode: 'cyan',
  relayTower: 'green',
  scanner: 'redBright',
};

export function RaidView({ replay, keepGrid, raidType, summary, initialSpeed, onSpeedChange, onDone }: RaidViewProps) {
  const [currentTick, setCurrentTick] = useState(0);
  const [speed, setSpeedState] = useState<SpeedMultiplier>(initialSpeed ?? 2);

  const setSpeed = useCallback((s: SpeedMultiplier) => {
    setSpeedState(s);
    onSpeedChange?.(s);
  }, [onSpeedChange]);
  const [paused, setPaused] = useState(false);
  const [probes, setProbes] = useState<Map<number, ProbeState>>(new Map());
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
    const newProbes = new Map(probes);
    const newLogs: string[] = [];

    for (const event of eventsInRange) {
      switch (event.type) {
        case 'probe_spawn':
          newProbes.set(event.probeId, {
            id: event.probeId,
            pos: { ...event.pos },
            alive: true,
            stunned: false,
          });
          newLogs.push(`Probe ${event.probeId} spawns from ${event.edge}`);
          break;
        case 'probe_move': {
          const p = newProbes.get(event.probeId);
          if (p) {
            p.pos = { ...event.to };
            p.stunned = false;
          }
          break;
        }
        case 'probe_stunned': {
          const p = newProbes.get(event.probeId);
          if (p) p.stunned = true;
          newLogs.push(`Probe ${event.probeId} STUNNED ${event.stunTicks}t`);
          break;
        }
        case 'firewall_damaged':
          newLogs.push(
            event.destroyed
              ? `Firewall DESTROYED!`
              : `Firewall hit (${event.hpRemaining} HP)`,
          );
          break;
        case 'scanner_hit':
          newLogs.push(
            event.hpRemaining <= 0
              ? `Scanner KILLED probe ${event.probeId}!`
              : `Scanner hit probe ${event.probeId} (-${event.damage}, ${event.hpRemaining} HP)`,
          );
          break;
        case 'vault_breach':
          newLogs.push(`VAULT BREACHED! ${raidType === 'attack' ? 'Gained' : 'Lost'} ${event.lootTaken.memory}M`);
          break;
        case 'probe_destroyed': {
          const p = newProbes.get(event.probeId);
          if (p) p.alive = false;
          newLogs.push(`Probe ${event.probeId} eliminated`);
          break;
        }
        case 'raid_end': {
          const outcomeText =
            event.outcome === 'defense_win'
              ? (raidType === 'defend' ? 'DEFENSE VICTORY!' : 'ATTACK FAILED — Defenses held')
              : event.outcome === 'partial_breach'
              ? (raidType === 'defend' ? 'PARTIAL BREACH — Some resources lost' : 'PARTIAL SUCCESS — Some loot gained')
              : (raidType === 'defend' ? 'FULL BREACH — Major losses!' : 'FULL SUCCESS — Major loot!');
          setOutcome(outcomeText);
          newLogs.push(outcomeText);
          break;
        }
      }
    }

    lastProcessedTickRef.current = currentTick;
    setProbes(newProbes);
    if (newLogs.length > 0) {
      setLogs((prev) => [...prev.slice(-8), ...newLogs]);
    }
  }, [currentTick]);

  const structureMap = new Map<string, typeof keepGrid.structures[number]>();
  for (const s of keepGrid.structures) {
    structureMap.set(`${s.pos.x},${s.pos.y}`, s);
  }

  const probeMap = new Map<string, ProbeState>();
  for (const [, p] of probes) {
    if (p.alive) {
      probeMap.set(`${p.pos.x},${p.pos.y}`, p);
    }
  }

  const gridLines: React.ReactNode[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const cells: React.ReactNode[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`;
      const probe = probeMap.get(key);
      const structure = structureMap.get(key);

      if (probe) {
        cells.push(
          <Text key={x} color={probe.stunned ? 'cyan' : 'red'} bold>
            {probe.stunned ? '◊ ' : '● '}
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
              <Text>Difficulty: Lv.{summary.difficulty}  Probes: {summary.probesKilled}/{summary.probesTotal} killed</Text>
              <Text>Firewalls destroyed: {summary.firewallsDestroyed}  Scanners active: {summary.scannersActive}</Text>
              {summary.lootGained.compute + summary.lootGained.memory + summary.lootGained.bandwidth > 0 && (
                <Text color="green">Resources gained: +{summary.lootGained.compute}C +{summary.lootGained.memory}M +{summary.lootGained.bandwidth}B</Text>
              )}
              {summary.lootLost.compute + summary.lootLost.memory + summary.lootLost.bandwidth > 0 && (
                <Text color="red">Resources lost: -{summary.lootLost.compute}C -{summary.lootLost.memory}M -{summary.lootLost.bandwidth}B</Text>
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
