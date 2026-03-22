import React from 'react';
import { Box, Text } from 'ink';
import type { CombatState, CombatEvent } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';
import { CombatGrid } from './CombatGrid.js';
import { CardHand } from './CardHand.js';

function formatCombatEvent(evt: CombatEvent): string {
  switch (evt.type) {
    case 'damage_dealt': return `Dealt ${evt.data.damage} damage to enemy`;
    case 'enemy_advance': return `Enemy advances to row ${evt.data.row}`;
    case 'gate_hit': return `Gate hit for ${evt.data.damage} damage${evt.data.blocked ? ` (${evt.data.blocked} blocked)` : ''}`;
    case 'enemy_killed': return `Enemy destroyed!`;
    case 'block_gained': return `Gained ${evt.data.value} Block`;
    case 'emplacement_placed': return `Emplacement placed in column ${(evt.data.column as number) + 1}`;
    case 'emplacement_triggered': return `Emplacement triggered in column ${(evt.data.column as number) + 1}`;
    case 'emplacement_destroyed': return `Emplacement destroyed in column ${(evt.data.column as number) + 1}`;
    case 'status_applied': return `Applied ${evt.data.type} (${evt.data.value})`;
    case 'card_played': {
      const cardDef = getCardDef(evt.data.cardId as string);
      return `Played ${cardDef?.name ?? evt.data.cardId}`;
    }
    case 'turn_start': return `— Turn ${evt.data.turn} —`;
    default: return '';
  }
}

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

      {(() => {
        const recentEvents = combat.events
          .filter(e => e.turn >= combat.turn - 1)
          .slice(-4);
        if (recentEvents.length === 0) return null;
        return (
          <Box flexDirection="column">
            {recentEvents.map((evt, i) => (
              <Text key={i} dimColor>
                {'  '}{formatCombatEvent(evt)}
              </Text>
            ))}
          </Box>
        );
      })()}

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
