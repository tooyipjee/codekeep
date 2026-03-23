import React from 'react';
import { Box, Text } from 'ink';
import type { CombatState, CombatEvent } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';
import { CombatGrid } from './CombatGrid.js';
import { CardHand } from './CardHand.js';

function formatCombatEvent(evt: CombatEvent): string {
  switch (evt.type) {
    case 'damage_dealt': return `  dealt ${evt.data.damage} damage`;
    case 'enemy_advance': return `  enemy advances to row ${evt.data.row}`;
    case 'gate_hit': return `  gate hit for ${evt.data.damage}${evt.data.blocked ? ` (${evt.data.blocked} blocked)` : ''}`;
    case 'enemy_killed': return `  enemy destroyed`;
    case 'block_gained': return `  +${evt.data.value} Block`;
    case 'emplacement_placed': return `  emplacement placed in col ${(evt.data.column as number) + 1}`;
    case 'emplacement_triggered': return `  emplacement triggered in col ${(evt.data.column as number) + 1}`;
    case 'emplacement_destroyed': return `  emplacement destroyed in col ${(evt.data.column as number) + 1}`;
    case 'status_applied': return `  applied ${evt.data.type} (${evt.data.value})`;
    case 'card_played': {
      const cardDef = getCardDef(evt.data.cardId as string);
      return `  played ${cardDef?.name ?? evt.data.cardId}`;
    }
    case 'turn_start': return `─ Turn ${evt.data.turn} ─`;
    default: return '';
  }
}

interface CombatViewProps {
  combat: CombatState;
  selectedCard: number;
  targetColumn: number;
  needsTarget: boolean;
  message: string;
  animating?: boolean;
}

export function CombatView({ combat, selectedCard, targetColumn, needsTarget, message, animating = false }: CombatViewProps) {
  const totalEnemies = combat.columns.reduce((s, c) => s + c.enemies.length, 0);

  return (
    <Box flexDirection="column">
      {/* Status bar */}
      <Box justifyContent="space-between">
        <Text bold color="yellow">{'◆ The Pale'}</Text>
        <Text>
          Turn <Text bold color="white">{combat.turn}</Text>
          {'  '}
          <Text color="cyan">{'◆'.repeat(Math.max(0, combat.resolve))}</Text>
          <Text dimColor>{'◇'.repeat(Math.max(0, combat.maxResolve - combat.resolve))}</Text>
          {'  '}
          Enemies <Text bold color="red">{totalEnemies}</Text>
          {'  '}
          Draw <Text dimColor>{combat.drawPile.length}</Text>
          {' / '}
          Discard <Text dimColor>{combat.discardPile.length}</Text>
        </Text>
      </Box>

      <CombatGrid
        columns={combat.columns}
        targetColumn={targetColumn}
        showTarget={needsTarget && selectedCard >= 0}
        gateHp={combat.gateHp}
        gateMaxHp={combat.gateMaxHp}
        gateBlock={combat.gateBlock}
      />

      <CardHand
        hand={combat.hand}
        selectedIndex={selectedCard}
        resolve={combat.resolve}
      />

      {/* Event log */}
      {(() => {
        const recentEvents = combat.events
          .filter(e => e.turn >= combat.turn - 1)
          .slice(-5);
        if (recentEvents.length === 0) return null;
        return (
          <Box flexDirection="column" marginTop={0}>
            <Text dimColor>{'─── Log ───'}</Text>
            {recentEvents.map((evt, i) => {
              const txt = formatCombatEvent(evt);
              if (!txt) return null;
              const isTurnHeader = evt.type === 'turn_start';
              return (
                <Text key={i} dimColor={!isTurnHeader} color={isTurnHeader ? 'white' : undefined}>
                  {txt}
                </Text>
              );
            })}
          </Box>
        );
      })()}

      {message && (
        <Text color={animating ? 'red' : 'yellow'} bold>{'  '}{animating ? '⚡ ' : ''}{message}</Text>
      )}

      {combat.phase === 'player' && !animating && (
        <Text dimColor>
          {'  '}{combat.hand.length > 0 ? `1-${combat.hand.length} card  ` : ''}←→ column  Enter play  e emplace  p potion  Space end  d deck  q quit
        </Text>
      )}
      {animating && (
        <Text dimColor>{'  '}Resolving enemy actions...</Text>
      )}

      {combat.outcome !== 'undecided' && (
        <Box flexDirection="column" marginTop={1} paddingX={1}>
          <Text bold color={combat.outcome === 'win' ? 'green' : 'red'}>
            {combat.outcome === 'win'
              ? '★ VICTORY — The siege is broken!'
              : '✗ DEFEAT — The Gate has fallen.'}
          </Text>
          <Text dimColor>{'Press Enter to continue.'}</Text>
        </Box>
      )}
    </Box>
  );
}
