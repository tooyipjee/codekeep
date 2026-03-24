import React from 'react';
import { Box, Text } from 'ink';
import type { CardInstance, CardDef } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';

interface CardHandProps {
  hand: CardInstance[];
  selectedIndex: number;
  resolve: number;
}

const CARD_W = 16;

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

function costPipsStr(cost: number, resolve: number): { text: string; affordable: boolean } {
  const text = '◆'.repeat(cost);
  return { text, affordable: cost <= resolve };
}

function shortSummary(def: CardDef): string {
  const parts: string[] = [];
  for (const e of def.effects) {
    switch (e.type) {
      case 'damage': parts.push(`${e.value}dmg${e.target === 'all' ? '★' : e.target === 'column' ? '↕' : ''}`); break;
      case 'block': parts.push(`${e.value}blk`); break;
      case 'draw': parts.push(`+${e.value}drw`); break;
      case 'heal': parts.push(`${e.value}hp`); break;
      case 'resolve': parts.push(`+${e.value}res`); break;
      case 'burn': parts.push(`${e.value}brn`); break;
      case 'vulnerable': parts.push(`vuln`); break;
      case 'weak': parts.push(`weak`); break;
      case 'self_damage': parts.push(`-${e.value}hp`); break;
      case 'exhaust_self': parts.push('exile'); break;
      default: break;
    }
  }
  const joined = parts.join(' ');
  const maxLen = CARD_W - 2;
  return joined.length > maxLen ? joined.slice(0, maxLen - 1) + '…' : joined;
}

function padRight(str: string, len: number): string {
  const visual = [...str].length;
  return visual >= len ? str.slice(0, len) : str + ' '.repeat(len - visual);
}

function CardBox({ def, index, isSelected, resolve }: { def: CardDef; index: number; isSelected: boolean; resolve: number }) {
  const inner = CARD_W - 2;
  const bc = isSelected ? 'yellow' : undefined;
  const dim = !isSelected;
  const canAfford = def.cost <= resolve;
  const pips = costPipsStr(def.cost, resolve);
  const emplace = def.type === 'emplace' ? '⚒' : '';

  const numStr = `${index + 1}`;
  const topContent = ` ${numStr} ${pips.text}`;
  const topPad = Math.max(0, inner - numStr.length - 1 - pips.text.length - 1);

  const nameLine = `${categorySymbol(def.category)} ${def.name}${emplace}`;
  const clippedName = nameLine.length > inner ? nameLine.slice(0, inner - 1) + '…' : nameLine;

  const summary = shortSummary(def);

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={bc} dimColor={dim}>{'┌'}</Text>
        <Text bold={isSelected} dimColor={dim && !isSelected}>{topContent}</Text>
        <Text color={pips.affordable ? 'cyan' : 'red'}>{''}</Text>
        <Text color={bc} dimColor={dim}>{' '.repeat(topPad)}{'┐'}</Text>
      </Text>
      <Text>
        <Text color={bc} dimColor={dim}>{'│'}</Text>
        <Text color={canAfford ? rarityColor(def.rarity) : 'gray'} bold={isSelected}>{padRight(clippedName, inner)}</Text>
        <Text color={bc} dimColor={dim}>{'│'}</Text>
      </Text>
      <Text>
        <Text color={bc} dimColor={dim}>{'│'}</Text>
        <Text dimColor>{padRight(summary, inner)}</Text>
        <Text color={bc} dimColor={dim}>{'│'}</Text>
      </Text>
      <Text>
        <Text color={bc} dimColor={dim}>{'└'}{'─'.repeat(inner)}{'┘'}</Text>
      </Text>
    </Box>
  );
}

export function CardHand({ hand, selectedIndex, resolve }: CardHandProps) {
  if (hand.length === 0) {
    return <Text dimColor>{'  '}No cards in hand.</Text>;
  }

  const selectedDef = selectedIndex >= 0 ? getCardDef(hand[selectedIndex]?.defId) : null;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        {hand.map((card, i) => {
          const def = getCardDef(card.defId);
          if (!def) return null;
          return <CardBox key={card.instanceId} def={def} index={i} isSelected={i === selectedIndex} resolve={resolve} />;
        })}
      </Box>
      {selectedDef && (
        <Text dimColor>{'  '}{selectedDef.description}</Text>
      )}
    </Box>
  );
}
