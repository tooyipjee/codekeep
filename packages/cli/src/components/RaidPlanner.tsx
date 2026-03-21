import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  GRID_SIZE, STRUCTURE_SYMBOLS, STRUCTURE_NAMES,
  RAIDER_TYPES, WARCAMP_TRAIN_COST, RESOURCE_ICONS,
  type KeepGridState, type ProbeType, type RaidSpawnSpec, type Resources, type WarCamp,
} from '@codekeep/shared';

type Edge = 'N' | 'S' | 'E' | 'W';
type Phase = 'scout' | 'army' | 'deploy' | 'confirm';

interface RaidPlannerProps {
  targetName: string;
  targetTrophies: number;
  targetGrid: KeepGridState;
  warCamp: WarCamp | null;
  resources: Resources;
  onLaunch: (spawnSpecs: RaidSpawnSpec[]) => void;
  onBack: () => void;
}

const EDGE_LABELS: Record<Edge, string> = { N: 'North', S: 'South', E: 'East', W: 'West' };
const RAIDER_SYMBOLS: Record<ProbeType, string> = { raider: 'R', scout: 'S', brute: 'B' };
const RAIDER_COLORS: Record<ProbeType, string> = { raider: 'red', scout: 'cyan', brute: 'magenta' };
const MAX_ARMY_SIZE = 8;

function getEdgeCoord(edge: Edge, offset: number): { x: number; y: number } {
  switch (edge) {
    case 'N': return { x: offset, y: 0 };
    case 'S': return { x: offset, y: GRID_SIZE - 1 };
    case 'E': return { x: GRID_SIZE - 1, y: offset };
    case 'W': return { x: 0, y: offset };
  }
}

export function RaidPlanner({ targetName, targetTrophies, targetGrid, warCamp, resources, onLaunch, onBack }: RaidPlannerProps) {
  const [phase, setPhase] = useState<Phase>('scout');
  const [army, setArmy] = useState<ProbeType[]>([]);
  const [armyTypeIdx, setArmyTypeIdx] = useState(0);
  const [spawns, setSpawns] = useState<{ edge: Edge; offset: number }[]>([]);
  const [deployEdge, setDeployEdge] = useState<Edge>('N');
  const [deployOffset, setDeployOffset] = useState(Math.floor(GRID_SIZE / 2));
  const [deployIdx, setDeployIdx] = useState(0);

  const raiderOptions: ProbeType[] = ['raider', 'scout', 'brute'];

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (phase === 'scout') { onBack(); return; }
      if (phase === 'army') { setPhase('scout'); return; }
      if (phase === 'deploy') { setPhase('army'); return; }
      if (phase === 'confirm') { setPhase('deploy'); return; }
      return;
    }

    if (phase === 'scout') {
      if (key.return) setPhase('army');
      return;
    }

    if (phase === 'army') {
      if (key.upArrow || input === 'k') setArmyTypeIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow || input === 'j') setArmyTypeIdx((i) => Math.min(raiderOptions.length - 1, i + 1));
      else if (key.return) {
        if (army.length < MAX_ARMY_SIZE) {
          setArmy((a) => [...a, raiderOptions[armyTypeIdx]]);
        }
      }
      else if (key.backspace || key.delete) {
        setArmy((a) => a.slice(0, -1));
      }
      else if (input === 'n' || key.tab) {
        if (army.length > 0) {
          setSpawns(army.map(() => ({ edge: 'N' as Edge, offset: Math.floor(GRID_SIZE / 2) })));
          setDeployIdx(0);
          setPhase('deploy');
        }
      }
      return;
    }

    if (phase === 'deploy') {
      if (key.leftArrow || input === 'a') {
        if (deployEdge === 'E' || deployEdge === 'W') {
          setDeployOffset((o) => Math.max(0, o - 1));
        } else {
          setDeployOffset((o) => Math.max(0, o - 1));
        }
      }
      else if (key.rightArrow || input === 'd') {
        setDeployOffset((o) => Math.min(GRID_SIZE - 1, o + 1));
      }
      else if (key.upArrow || input === 'w') {
        setDeployOffset((o) => Math.max(0, o - 1));
      }
      else if (key.downArrow || input === 's') {
        setDeployOffset((o) => Math.min(GRID_SIZE - 1, o + 1));
      }
      else if (input === 'n') setDeployEdge('N');
      else if (input === 'e') setDeployEdge('E');
      else if (input === 'z') setDeployEdge('S');
      else if (input === 'x') setDeployEdge('W');
      else if (key.return) {
        setSpawns((s) => {
          const ns = [...s];
          ns[deployIdx] = { edge: deployEdge, offset: deployOffset };
          return ns;
        });
        if (deployIdx < army.length - 1) {
          setDeployIdx((i) => i + 1);
        } else {
          setPhase('confirm');
        }
      }
      else if (key.tab) {
        setDeployIdx((i) => (i + 1) % army.length);
      }
      return;
    }

    if (phase === 'confirm') {
      if (key.return || input === 'y') {
        const specs: RaidSpawnSpec[] = army.map((type, i) => ({
          raiderType: type,
          edge: spawns[i]?.edge ?? 'N',
          offset: spawns[i]?.offset ?? 8,
          waveDelay: 0,
        }));
        onLaunch(specs);
      }
      return;
    }
  });

  const renderGrid = () => {
    const cells: string[][] = Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill('·'));

    for (const s of targetGrid.structures) {
      if (s.kind === 'trap' || s.kind === 'ward') {
        cells[s.pos.y][s.pos.x] = '?';
      } else {
        cells[s.pos.y][s.pos.x] = STRUCTURE_SYMBOLS[s.kind];
      }
    }

    // Overlay spawn markers in deploy phase
    if (phase === 'deploy' || phase === 'confirm') {
      for (let i = 0; i < spawns.length; i++) {
        const sp = spawns[i];
        if (!sp) continue;
        const coord = getEdgeCoord(sp.edge, sp.offset);
        cells[coord.y][coord.x] = RAIDER_SYMBOLS[army[i]];
      }
      // Current placement cursor
      if (phase === 'deploy') {
        const cur = getEdgeCoord(deployEdge, deployOffset);
        cells[cur.y][cur.x] = '▼';
      }
    }

    const header = '  ' + Array.from({ length: GRID_SIZE }, (_, i) => i.toString(16).toUpperCase()).join(' ');
    const rows = cells.map((row, y) => {
      const label = y.toString(16).toUpperCase();
      const line = row.join(' ');
      return `${label} ${line}`;
    });

    return [header, ...rows];
  };

  const gridLines = renderGrid();

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="red">{'⚔  RAID PLANNER'}</Text>
      <Box gap={2}>
        <Text>Target: <Text bold color="yellow">{targetName}</Text></Text>
        <Text>Trophies: <Text bold>{targetTrophies}</Text></Text>
      </Box>
      <Text> </Text>

      {/* Grid view */}
      <Box flexDirection="column">
        {gridLines.map((line, i) => {
          if (i === 0) return <Text key={i} dimColor>{line}</Text>;
          return <Text key={i}>{line}</Text>;
        })}
      </Box>
      <Text> </Text>

      {/* Legend */}
      <Box gap={2}>
        <Text dimColor># wall  $ treasury  ^ tower  ! archer  & vault  ? hidden</Text>
      </Box>
      <Text> </Text>

      {/* Phase-specific UI */}
      {phase === 'scout' && (
        <Box flexDirection="column">
          <Text bold color="cyan">SCOUT PHASE</Text>
          <Text>Study the enemy keep. Traps and wards are hidden (?).</Text>
          <Text>Structures: {targetGrid.structures.length} placed</Text>
          <Text> </Text>
          <Text dimColor>Enter → pick your army  Esc → back</Text>
        </Box>
      )}

      {phase === 'army' && (
        <Box flexDirection="column">
          <Text bold color="cyan">ARMY SELECTION ({army.length}/{MAX_ARMY_SIZE})</Text>
          <Text> </Text>
          {raiderOptions.map((type, i) => {
            const stats = RAIDER_TYPES[type];
            const cost = WARCAMP_TRAIN_COST[type];
            return (
              <Box key={type}>
                <Text color={armyTypeIdx === i ? 'yellow' : undefined} bold={armyTypeIdx === i}>
                  {armyTypeIdx === i ? ' ▸ ' : '   '}
                  <Text color={RAIDER_COLORS[type]}>{RAIDER_SYMBOLS[type]}</Text> {type.charAt(0).toUpperCase() + type.slice(1)}
                  {' '}HP:{stats.hp} DMG:{stats.damage} SPD:{stats.speed}
                  {' '}({cost.gold}g {cost.wood}w {cost.stone}s)
                </Text>
              </Box>
            );
          })}
          <Text> </Text>
          <Box gap={1}>
            <Text>Army: </Text>
            {army.length === 0 ? <Text dimColor>(empty)</Text> : army.map((type, i) => (
              <Text key={i} color={RAIDER_COLORS[type]} bold>{RAIDER_SYMBOLS[type]}</Text>
            ))}
          </Box>
          <Text> </Text>
          <Text dimColor>Enter add  Backspace remove  Tab/N → deploy  Esc back</Text>
        </Box>
      )}

      {phase === 'deploy' && (
        <Box flexDirection="column">
          <Text bold color="cyan">DEPLOY — Placing {RAIDER_SYMBOLS[army[deployIdx]]} ({army[deployIdx]}) [{deployIdx + 1}/{army.length}]</Text>
          <Text>Edge: <Text bold color="yellow">{EDGE_LABELS[deployEdge]}</Text>  Position: <Text bold>{deployOffset.toString(16).toUpperCase()}</Text></Text>
          <Text> </Text>
          <Box gap={1}>
            <Text>Spawns: </Text>
            {army.map((type, i) => {
              const sp = spawns[i];
              const placed = i < deployIdx || (i === deployIdx && false);
              return (
                <Text key={i} color={i === deployIdx ? 'yellow' : placed ? RAIDER_COLORS[type] : 'gray'}>
                  {RAIDER_SYMBOLS[type]}{sp ? `@${sp.edge}${sp.offset.toString(16)}` : ''}
                  {i < army.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Box>
          <Text> </Text>
          <Text dimColor>←→ / ↑↓ position  N/E/Z/X edge  Enter place  Tab next  Esc back</Text>
        </Box>
      )}

      {phase === 'confirm' && (
        <Box flexDirection="column">
          <Text bold color="green">READY TO ATTACK</Text>
          <Text> </Text>
          <Box flexDirection="column">
            {army.map((type, i) => {
              const sp = spawns[i];
              return (
                <Text key={i}>
                  <Text color={RAIDER_COLORS[type]} bold>{RAIDER_SYMBOLS[type]}</Text>
                  {' '}{type} → {sp ? `${EDGE_LABELS[sp.edge]} edge, pos ${sp.offset.toString(16).toUpperCase()}` : 'unplaced'}
                </Text>
              );
            })}
          </Box>
          <Text> </Text>
          <Text bold>Press <Text color="green">Enter</Text> to launch raid or <Text color="red">Esc</Text> to adjust</Text>
        </Box>
      )}
    </Box>
  );
}
