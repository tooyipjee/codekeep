import React from 'react';
import { Box, Text } from 'ink';
import type { CombatState } from '@codekeep/shared';
import { CombatGrid } from './CombatGrid.js';
import { CardHand } from './CardHand.js';

interface CombatViewProps {
  combat: CombatState;
  selectedCard: number;
  targetColumn: number;
  needsTarget: boolean;
  message: string;
}

export function CombatView({ combat, selectedCard, targetColumn, needsTarget, message }: CombatViewProps) {
  const totalEnemies = combat.columns.reduce((s, c) => s + c.enemies.length, 0);

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold color="yellow">◆ CodeKeep — The Pale</Text>
        <Text>
          Turn <Text bold>{combat.turn}</Text>
          {'  '}Resolve <Text bold color="cyan">{combat.resolve}/{combat.maxResolve}</Text>
          {'  '}Enemies <Text bold color="red">{totalEnemies}</Text>
          {'  '}Draw <Text dimColor>{combat.drawPile.length}</Text>
          {'  '}Discard <Text dimColor>{combat.discardPile.length}</Text>
        </Text>
      </Box>

      <Text> </Text>

      <CombatGrid
        columns={combat.columns}
        targetColumn={targetColumn}
        showTarget={needsTarget && selectedCard >= 0}
        gateHp={combat.gateHp}
        gateMaxHp={combat.gateMaxHp}
        gateBlock={combat.gateBlock}
      />

      <Text> </Text>

      <CardHand
        hand={combat.hand}
        selectedIndex={selectedCard}
        resolve={combat.resolve}
      />

      <Text> </Text>

      {message && <Text color="yellow">{message}</Text>}

      {combat.phase === 'player' && (
        <Text dimColor>
          1-{combat.hand.length} card  ←→ column  Enter play  e emplace  p potion  Space end turn  d deck  q quit
        </Text>
      )}

      {combat.outcome !== 'undecided' && (
        <Box marginTop={1}>
          <Text bold color={combat.outcome === 'win' ? 'green' : 'red'}>
            {combat.outcome === 'win'
              ? '★ VICTORY — The siege is broken!'
              : '✗ DEFEAT — The Gate has fallen.'}
          </Text>
        </Box>
      )}
    </Box>
  );
}
