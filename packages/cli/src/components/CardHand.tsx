import React from 'react';
import { Box, Text } from 'ink';
import type { CardInstance, CardDef } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';

interface CardHandProps {
  hand: CardInstance[];
  selectedIndex: number;
  resolve: number;
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'uncommon': return 'green';
    case 'rare': return 'blue';
    case 'legendary': return 'magenta';
    default: return 'white';
  }
}

function categorySymbol(category: string): string {
  switch (category) {
    case 'armament': return '⚔';
    case 'fortification': return '◇';
    case 'edict': return '✦';
    case 'wild': return '◈';
    default: return '·';
  }
}

function costPips(cost: number, resolve: number): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < cost; i++) {
    nodes.push(
      <Text key={i} color={i < resolve ? 'cyan' : 'red'} bold>{'◆'}</Text>
    );
  }
  return nodes;
}

function effectSummary(def: CardDef): string {
  const parts: string[] = [];
  for (const e of def.effects) {
    switch (e.type) {
      case 'damage': parts.push(`${e.value} dmg${e.target === 'all' ? ' ALL' : e.target === 'column' ? ' col' : ''}`); break;
      case 'block': parts.push(`${e.value} blk`); break;
      case 'draw': parts.push(`+${e.value} draw`); break;
      case 'heal': parts.push(`${e.value} heal`); break;
      case 'resolve': parts.push(`+${e.value} res`); break;
      case 'burn': parts.push(`${e.value} burn`); break;
      case 'vulnerable': parts.push(`${e.value} vuln`); break;
      case 'weak': parts.push(`${e.value} weak`); break;
      case 'self_damage': parts.push(`${e.value} self-dmg`); break;
      case 'damage_if_vulnerable': parts.push(`${e.value} dmg (×2 if vuln)`); break;
      case 'damage_equal_block': parts.push('dmg=blk'); break;
      case 'damage_per_burn': parts.push(`${e.value}×burn dmg`); break;
      case 'trigger_emplacements': parts.push('trigger walls'); break;
      case 'damage_plus_block': parts.push(`${e.value} dmg+blk`); break;
      case 'exhaust_draw': parts.push(`exile+${e.value} draw`); break;
      case 'damage_if_emplaced': parts.push(`${e.value} dmg if wall`); break;
      case 'damage_per_emplace': parts.push(`${e.value}×wall dmg`); break;
      default: break;
    }
  }
  return parts.join(', ');
}

export function CardHand({ hand, selectedIndex, resolve }: CardHandProps) {
  if (hand.length === 0) {
    return <Text dimColor>{'  '}No cards in hand.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{'─── Hand (' + hand.length + ') ───'}</Text>
      {hand.map((card, i) => {
        const def = getCardDef(card.defId);
        if (!def) return null;
        const isSelected = i === selectedIndex;
        const canAfford = def.cost <= resolve;
        const summary = effectSummary(def);

        return (
          <Box key={card.instanceId} flexDirection="column">
            <Text>
              <Text bold={isSelected} color={isSelected ? 'yellow' : 'white'}>
                {isSelected ? ' ▶ ' : '   '}
              </Text>
              <Text color={canAfford ? rarityColor(def.rarity) : 'gray'} bold={isSelected}>
                {categorySymbol(def.category)} {def.name}
              </Text>
              <Text> </Text>
              {costPips(def.cost, resolve)}
              <Text dimColor>{' '}{summary}</Text>
              {isSelected && def.type === 'emplace' && <Text color="cyan">{' '}[emplaceable]</Text>}
            </Text>
            {isSelected && (
              <Text dimColor>{'      '}{def.description}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
