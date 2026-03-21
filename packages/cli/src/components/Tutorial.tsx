import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameSave, GridCoord, PlacedStructure } from '@codekeep/shared';
import { GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL } from '@codekeep/shared';

interface TutorialProps {
  gameSave: GameSave;
  onComplete: () => void;
}

type Step = 'welcome' | 'move' | 'place_wall' | 'place_trap' | 'raid_explain' | 'done';

export function Tutorial({ gameSave, onComplete }: TutorialProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [cursor, setCursor] = useState<GridCoord>({ x: 8, y: 8 });
  const [placed, setPlaced] = useState<PlacedStructure[]>([]);

  const advance = useCallback(() => {
    switch (step) {
      case 'welcome': setStep('move'); break;
      case 'move': setStep('place_wall'); break;
      case 'place_wall': break;
      case 'place_trap': break;
      case 'raid_explain': setStep('done'); break;
      case 'done': onComplete(); break;
    }
  }, [step, onComplete]);

  useInput((input, key) => {
    if (input === 's') { onComplete(); return; }

    if (step === 'welcome' || step === 'move' || step === 'raid_explain' || step === 'done') {
      if (key.return || input === ' ') advance();
      return;
    }

    if (input === 'h' || input === 'a' || key.leftArrow) setCursor(c => ({ ...c, x: Math.max(0, c.x - 1) }));
    else if (input === 'l' || input === 'd' || key.rightArrow) setCursor(c => ({ ...c, x: Math.min(GRID_SIZE - 1, c.x + 1) }));
    else if (input === 'k' || input === 'w' || key.upArrow) setCursor(c => ({ ...c, y: Math.max(0, c.y - 1) }));
    else if (input === 'j' || input === 's' || key.downArrow) setCursor(c => ({ ...c, y: Math.min(GRID_SIZE - 1, c.y + 1) }));
    else if (key.return || input === 'e') {
      const occupied = placed.some(s => s.pos.x === cursor.x && s.pos.y === cursor.y);
      if (occupied) return;

      const kind = step === 'place_wall' ? 'wall' : 'trap';
      const newStruct: PlacedStructure = {
        id: `tut-${kind}-${cursor.x}-${cursor.y}`,
        kind,
        level: 1,
        pos: { ...cursor },
        placedAtUnixMs: Date.now(),
      };
      setPlaced(prev => [...prev, newStruct]);

      if (step === 'place_wall') {
        setStep('place_trap');
      } else if (step === 'place_trap') {
        setStep('raid_explain');
      }
    }
  });

  const renderMiniGrid = () => {
    const size = 8;
    const offset = 4;
    const structMap = new Map<string, PlacedStructure>();
    for (const s of placed) structMap.set(`${s.pos.x},${s.pos.y}`, s);

    const rows: React.ReactNode[] = [];
    for (let y = offset; y < offset + size; y++) {
      const cells: React.ReactNode[] = [];
      for (let x = offset; x < offset + size; x++) {
        const isCursor = cursor.x === x && cursor.y === y;
        const struct = structMap.get(`${x},${y}`);
        let char = EMPTY_CELL_SYMBOL;
        let color: string | undefined;
        if (struct) {
          char = STRUCTURE_SYMBOLS[struct.kind];
          color = struct.kind === 'wall' ? 'white' : 'magenta';
        }
        if (isCursor) {
          cells.push(<Text key={x} backgroundColor="white" color="black" bold>{char + ' '}</Text>);
        } else if (color) {
          cells.push(<Text key={x} color={color}>{char + ' '}</Text>);
        } else {
          cells.push(<Text key={x} dimColor>{char + ' '}</Text>);
        }
      }
      rows.push(<Box key={y}>{cells}</Box>);
    }
    return <Box flexDirection="column">{rows}</Box>;
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">{'◆ CodeKeep — Tutorial'}</Text>
      <Text> </Text>

      {step === 'welcome' && (
        <>
          <Text>Welcome to <Text bold>CodeKeep</Text>, {gameSave.player.displayName}!</Text>
          <Text> </Text>
          <Text>Build an ASCII fortress. Defend your treasuries from raiding parties.</Text>
          <Text>Your realm earns gold, wood, and stone over time (and from git activity if you hook it up).</Text>
          <Text> </Text>
          <Text>Place <Text color="white" bold>#</Text> Stone Walls to block paths, <Text color="magenta" bold>%</Text> Bear Traps to stun,</Text>
          <Text><Text color="redBright" bold>!</Text> Archer Towers to shoot raiders, and guard your <Text color="yellow" bold>$</Text> Treasuries.</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to try it out, s to skip</Text>
        </>
      )}

      {step === 'move' && (
        <>
          <Text bold>Step 1: Movement</Text>
          <Text> </Text>
          <Text>Move with <Text bold>h j k l</Text> (vim), <Text bold>W A S D</Text>, or <Text bold>arrow keys</Text>.</Text>
          <Text>Your keep is a <Text bold>16×16 grid</Text>.</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to continue</Text>
        </>
      )}

      {step === 'place_wall' && (
        <>
          <Text bold>Step 2: Place a Stone Wall</Text>
          <Text>Move to any empty cell and press <Text bold>Enter</Text> or <Text bold>e</Text>.</Text>
          <Text> </Text>
          {renderMiniGrid()}
          <Text> </Text>
          <Text dimColor>Move with h/j/k/l, place with Enter</Text>
        </>
      )}

      {step === 'place_trap' && (
        <>
          <Text bold>Step 3: Place a Bear Trap</Text>
          <Text>Now place a <Text color="magenta" bold>% Bear Trap</Text> to stun the next raider who steps on it!</Text>
          <Text> </Text>
          {renderMiniGrid()}
          <Text> </Text>
          <Text dimColor>Move and press Enter to place</Text>
        </>
      )}

      {step === 'raid_explain' && (
        <>
          <Text bold color="green">Nice work! Your first defenses are placed.</Text>
          <Text> </Text>
          <Text>In the full game:</Text>
          <Text>  <Text bold>r</Text> — Quick defend (instant result from the keep screen)</Text>
          <Text>  <Text bold>Defend Keep</Text> — Watch raiders assault YOUR grid in real time</Text>
          <Text>  <Text bold>Attack NPC</Text> — Raid NPC keeps to seize supplies</Text>
          <Text> </Text>
          <Text>Your structures earn <Text color="green">passive resources</Text> over time.</Text>
          <Text>Raiders will strike <Text color="red">while you are away</Text> — fortify well!</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to continue</Text>
        </>
      )}

      {step === 'done' && (
        <>
          <Text bold color="yellow">You are ready! Go build your keep.</Text>
          <Text> </Text>
          <Text>Tips:</Text>
          <Text>  • Press <Text bold>?</Text> anytime for full help</Text>
          <Text>  • Use <Text bold>1-6</Text> to quickly select structures</Text>
          <Text>  • Press <Text bold>Tab</Text> to jump between placed structures</Text>
          <Text>  • Press <Text bold>f</Text> for a kingdom boon (or install git hooks)</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to start playing</Text>
        </>
      )}
    </Box>
  );
}
