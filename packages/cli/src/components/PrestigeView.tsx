import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { GameSave } from '@codekeep/shared';
import { PRESTIGE_UNLOCKS, PRESTIGE_MIN_WINS } from '@codekeep/shared';

interface PrestigeViewProps {
  gameSave: GameSave;
  eligible: boolean;
  reason?: string;
  onPrestige: () => void;
  onBack: () => void;
}

export function PrestigeView({ gameSave, eligible, reason, onPrestige, onBack }: PrestigeViewProps) {
  const [confirmed, setConfirmed] = useState(false);

  const currentLevel = gameSave.prestige?.ascensionLevel ?? 0;
  const nextLevel = currentLevel + 1;
  const prestige = gameSave.prestige;
  const nextUnlock = PRESTIGE_UNLOCKS.find((u) => u.ascensionLevel === nextLevel);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (confirmed) {
        setConfirmed(false);
      } else {
        onBack();
      }
    } else if (input === 'y' && confirmed && eligible) {
      onPrestige();
    } else if (key.return && eligible && !confirmed) {
      setConfirmed(true);
    }
  });

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="magenta">{'★ PRESTIGE / ASCENSION ★'}</Text>
      <Text> </Text>

      <Text bold>Current Ascension: <Text color="yellow">Level {currentLevel}</Text></Text>
      {prestige && (
        <>
          <Text dimColor>Lifetime raids won: {prestige.lifetimeRaidsWon + gameSave.progression.totalRaidsWon}</Text>
          <Text dimColor>Lifetime best streak: {Math.max(prestige.lifetimeBestStreak, gameSave.progression.bestWinStreak)}</Text>
        </>
      )}
      <Text> </Text>

      <Text bold>Permanent Unlocks:</Text>
      {PRESTIGE_UNLOCKS.map((u) => {
        const active = u.ascensionLevel <= currentLevel;
        const isNext = u.ascensionLevel === nextLevel;
        return (
          <Text key={u.id} color={active ? 'green' : isNext ? 'yellow' : 'gray'}>
            {active ? '  ✓ ' : isNext ? '  → ' : '  · '}
            <Text bold={active || isNext}>Lv.{u.ascensionLevel} {u.name}</Text>
            <Text dimColor={!active && !isNext}> — {u.description}</Text>
          </Text>
        );
      })}
      <Text> </Text>

      {!eligible && (
        <Text color="red">Cannot prestige: {reason}</Text>
      )}

      {eligible && !confirmed && (
        <Box flexDirection="column">
          <Text color="yellow" bold>Ready to ascend to Level {nextLevel}!</Text>
          {nextUnlock && (
            <Text color="green">New unlock: {nextUnlock.name} — {nextUnlock.description}</Text>
          )}
          <Text> </Text>
          <Text bold color="red">WARNING: This resets your keep, structures, and raid history.</Text>
          <Text bold color="red">Achievements and prestige unlocks are permanent.</Text>
          <Text> </Text>
          <Text dimColor>Press Enter to begin ascension, Esc to go back</Text>
        </Box>
      )}

      {eligible && confirmed && (
        <Box flexDirection="column">
          <Text bold color="red">{'╔══════════════════════════════════════╗'}</Text>
          <Text bold color="red">{'║  ARE YOU SURE? This cannot be undone ║'}</Text>
          <Text bold color="red">{'╚══════════════════════════════════════╝'}</Text>
          <Text> </Text>
          <Text>Press <Text bold color="yellow">Y</Text> to confirm ascension</Text>
          <Text>Press <Text bold>Esc</Text> to cancel</Text>
        </Box>
      )}

      {!eligible && !confirmed && (
        <Box marginTop={1}>
          <Text dimColor>
            Requirement: {PRESTIGE_MIN_WINS} raid wins
            {' '}({gameSave.progression.totalRaidsWon}/{PRESTIGE_MIN_WINS})
          </Text>
        </Box>
      )}

      <Text> </Text>
      <Text dimColor>Press Esc to return to menu</Text>
    </Box>
  );
}
