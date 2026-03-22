import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GridCoord, StructureKind, PlacedStructure, GameSave } from '@codekeep/shared';
import { GRID_SIZE, ALL_STRUCTURE_KINDS, STRUCTURE_NAMES, STRUCTURE_COSTS, RESOURCE_ICONS, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL } from '@codekeep/shared';
import { placeStructure, upgradeStructure, demolishStructure } from '@codekeep/server';
import {
  createDailyChallenge,
  runDailyChallengeWave,
  getDailyChallengeProofHash,
  type DailyChallengeState,
} from '../lib/daily-challenge.js';

interface DailyChallengeProps {
  onBack: () => void;
  onSaveScore: (dateKey: string, wavesCleared: number, score: number) => void;
}

export function DailyChallenge({ onBack, onSaveScore }: DailyChallengeProps) {
  const [state, setState] = useState<DailyChallengeState>(() => createDailyChallenge());
  const [cursor, setCursor] = useState<GridCoord>({ x: 8, y: 8 });
  const [structureIndex, setStructureIndex] = useState(0);
  const [phase, setPhase] = useState<'build' | 'result'>('build');
  const [message, setMessage] = useState('Place structures, then press R to start a wave');

  const selectedStructure = ALL_STRUCTURE_KINDS[structureIndex];

  useInput((input, key) => {
    if (phase === 'result') {
      if (!state.alive) {
        if (key.return || input === ' ') {
          onSaveScore(state.dateKey, state.wave, state.score);
          onBack();
        }
        return;
      }
      if (key.return || input === ' ') {
        setPhase('build');
        setMessage('Prepare for next wave — place/upgrade, then R to fight');
      }
      return;
    }

    if (key.escape) {
      onSaveScore(state.dateKey, state.wave, state.score);
      onBack();
      return;
    }

    if (key.upArrow || input === 'k') setCursor((c) => ({ x: c.x, y: Math.max(0, c.y - 1) }));
    else if (key.downArrow || input === 'j') setCursor((c) => ({ x: c.x, y: Math.min(GRID_SIZE - 1, c.y + 1) }));
    else if (key.leftArrow || input === 'h') setCursor((c) => ({ x: Math.max(0, c.x - 1), y: c.y }));
    else if (key.rightArrow || input === 'l') setCursor((c) => ({ x: Math.min(GRID_SIZE - 1, c.x + 1), y: c.y }));
    else if (input === '[') setStructureIndex((i) => (i - 1 + ALL_STRUCTURE_KINDS.length) % ALL_STRUCTURE_KINDS.length);
    else if (input === ']') setStructureIndex((i) => (i + 1) % ALL_STRUCTURE_KINDS.length);
    else if (input >= '1' && input <= '6') setStructureIndex(parseInt(input) - 1);
    else if (input === 'e') {
      const result = placeStructure(state.keep, cursor, selectedStructure);
      if (result.ok && result.keep) {
        setState((s) => ({ ...s, keep: result.keep! }));
        setMessage(`Placed ${STRUCTURE_NAMES[selectedStructure]}`);
      } else {
        setMessage(`!${result.reason}`);
      }
    }
    else if (input === 'u') {
      const result = upgradeStructure(state.keep, cursor);
      if (result.ok && result.keep) {
        setState((s) => ({ ...s, keep: result.keep! }));
        setMessage('Upgraded!');
      } else {
        setMessage(`!${result.reason}`);
      }
    }
    else if (input === 'x') {
      const result = demolishStructure(state.keep, cursor);
      if (result.ok && result.keep) {
        setState((s) => ({ ...s, keep: result.keep! }));
        setMessage('Demolished');
      } else {
        setMessage(`!${result.reason}`);
      }
    }
    else if (input === 'r') {
      const newState = runDailyChallengeWave(state);
      setState(newState);
      setPhase('result');
      if (newState.alive) {
        setMessage(`Wave ${newState.wave} cleared! +${newState.score - state.score} pts`);
      } else {
        setMessage(`Breached on wave ${newState.wave}! Final score: ${newState.score}`);
      }
    }
  });

  const r = state.keep.resources;
  const grid = state.keep.grid;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color="magenta">{'★ Daily Challenge'}</Text>
        <Text dimColor>{'│'}</Text>
        <Text>Wave: <Text bold>{state.wave}</Text></Text>
        <Text dimColor>{'│'}</Text>
        <Text>Score: <Text bold color="yellow">{state.score}</Text></Text>
        <Text dimColor>{'│'}</Text>
        <Text color="yellow">{RESOURCE_ICONS.gold}{r.gold}</Text>
        <Text color="green">{RESOURCE_ICONS.wood}{r.wood}</Text>
        <Text color="white">{RESOURCE_ICONS.stone}{r.stone}</Text>
      </Box>
      <Text color={message.startsWith('!') ? 'red' : 'yellow'}>{message}</Text>

      <Box marginTop={1}>
        <Box flexDirection="column">
          {Array.from({ length: GRID_SIZE }, (_, y) => (
            <Text key={y}>
              {Array.from({ length: GRID_SIZE }, (_, x) => {
                const isCursor = cursor.x === x && cursor.y === y;
                const structure = grid.structures.find((s) => s.pos.x === x && s.pos.y === y);
                const ch = structure ? STRUCTURE_SYMBOLS[structure.kind] : EMPTY_CELL_SYMBOL;
                const suffix = structure && structure.level > 1 ? String(structure.level) : ' ';

                if (isCursor) {
                  return <Text key={x} backgroundColor="white" color="black" bold>{ch}{suffix}</Text>;
                }
                if (structure) {
                  const color = structure.kind === 'treasury' ? 'yellow' : structure.kind === 'wall' ? 'white' : structure.kind === 'trap' ? 'magenta' : structure.kind === 'archerTower' ? 'redBright' : structure.kind === 'ward' ? 'cyan' : 'green';
                  return <Text key={x} color={color} bold={structure.level >= 2}>{ch}{suffix}</Text>;
                }
                return <Text key={x} dimColor>{ch}{' '}</Text>;
              })}
            </Text>
          ))}
        </Box>

        <Box flexDirection="column" marginLeft={2} width={24}>
          <Text>Sel: <Text bold>{STRUCTURE_NAMES[selectedStructure]}</Text></Text>
          <Text dimColor>{'e place  u upgrade  x demo'}</Text>
          <Text dimColor>{'[ ] cycle  1-6 select'}</Text>
          <Text dimColor>{'r start wave'}</Text>
          <Text dimColor>{'Esc back to menu'}</Text>
          {phase === 'result' && state.alive && <Text color="green" bold>Press Enter to continue</Text>}
          {phase === 'result' && !state.alive && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="red" bold>GAME OVER</Text>
              <Text>Waves: {state.wave} │ Score: {state.score}</Text>
              <Text dimColor>Proof: #{getDailyChallengeProofHash(state)}</Text>
              <Text dimColor>Press Enter to exit</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
