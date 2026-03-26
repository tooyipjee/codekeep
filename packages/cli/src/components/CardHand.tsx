import React from 'react';
import { Box, Text } from 'ink';
import type { CardInstance, CardDef } from '@codekeep/shared';
import { getCardDef } from '@codekeep/shared';

interface CardHandProps {
  hand: CardInstance[];
  selectedIndex: number;
  resolve: number;
}

const MAX_HAND_W = 98;
const MAX_CARD_W = 19;
const MIN_CARD_W = 10;

function calcCardWidth(handSize: number): number {
  if (handSize <= 0) return MAX_CARD_W;
  return Math.max(MIN_CARD_W, Math.min(MAX_CARD_W, Math.floor(MAX_HAND_W / handSize)));
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

function costPipsStr(cost: number): string {
  return '◆'.repeat(cost);
}

function shortSummary(def: CardDef, maxLen: number): string {
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
  return joined.length > maxLen ? joined.slice(0, maxLen - 1) + '…' : joined;
}

function padRight(str: string, len: number): string {
  const visual = [...str].length;
  return visual >= len ? str.slice(0, len) : str + ' '.repeat(len - visual);
}

function CardBox({ def, index, isSelected, resolve, cardW }: { def: CardDef; index: number; isSelected: boolean; resolve: number; cardW: number }) {
  const inner = cardW - 2;
  const bc = isSelected ? 'yellow' : undefined;
  const dim = !isSelected;
  const canAfford = def.cost <= resolve;
  const pips = costPipsStr(def.cost);
  const emplace = def.type === 'emplace' ? '⚒' : '';
  const showSummary = cardW >= 13;

  const numStr = `${index + 1}`;
  const topContent = ` ${numStr} ${pips}`;
  const topPad = Math.max(0, inner - numStr.length - 1 - pips.length - 1);

  const nameLine = `${categorySymbol(def.category)} ${def.name}${emplace}`;
  const clippedName = nameLine.length > inner ? nameLine.slice(0, inner - 1) + '…' : nameLine;

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={bc} dimColor={dim}>{'┌'}</Text>
        <Text bold={isSelected} dimColor={dim && !isSelected}>{topContent}</Text>
        <Text color={canAfford ? 'cyan' : 'red'}>{''}</Text>
        <Text color={bc} dimColor={dim}>{' '.repeat(topPad)}{'┐'}</Text>
      </Text>
      <Text>
        <Text color={bc} dimColor={dim}>{'│'}</Text>
        <Text color={canAfford ? rarityColor(def.rarity) : 'gray'} bold={isSelected}>{padRight(clippedName, inner)}</Text>
        <Text color={bc} dimColor={dim}>{'│'}</Text>
      </Text>
      {showSummary && (
        <Text>
          <Text color={bc} dimColor={dim}>{'│'}</Text>
          <Text dimColor>{padRight(shortSummary(def, inner), inner)}</Text>
          <Text color={bc} dimColor={dim}>{'│'}</Text>
        </Text>
      )}
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

  const cardW = calcCardWidth(hand.length);
  const selectedDef = selectedIndex >= 0 ? getCardDef(hand[selectedIndex]?.defId) : null;

  return (
    <Box flexDirection="column" width={MAX_HAND_W}>
      <Box flexDirection="row" flexWrap="wrap">
        {hand.map((card, i) => {
          const def = getCardDef(card.defId);
          if (!def) return null;
          return <CardBox key={card.instanceId} def={def} index={i} isSelected={i === selectedIndex} resolve={resolve} cardW={cardW} />;
        })}
      </Box>
      {selectedDef && (
        <Text dimColor>{'  '}{selectedDef.description}</Text>
      )}
    </Box>
  );
}
