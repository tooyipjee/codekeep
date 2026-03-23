import React from 'react';
import { Box, Text } from 'ink';
import type { Column, EnemyInstance } from '@codekeep/shared';
import { getCardDef, getEnemyTemplate, ROWS } from '@codekeep/shared';

interface CombatGridProps {
  columns: Column[];
  targetColumn: number;
  showTarget: boolean;
  gateHp: number;
  gateMaxHp: number;
  gateBlock: number;
}

const INNER = 12;

function hpBar(current: number, max: number, width: number): string {
  const pct = max > 0 ? current / max : 0;
  const filled = Math.max(0, Math.min(width, Math.round(pct * width)));
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function hpColor(current: number, max: number): string {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return pct > 60 ? 'green' : pct > 30 ? 'yellow' : 'red';
}

function intentInfo(intent: EnemyInstance['intent']): { text: string; color: string } {
  if (!intent) return { text: '', color: 'white' };
  switch (intent.type) {
    case 'advance': return { text: '↓Mv', color: 'white' };
    case 'attack': return { text: `⚔${intent.value}`, color: 'red' };
    case 'buff': return { text: '▲Buf', color: 'magenta' };
    case 'debuff': return { text: '▼Hex', color: 'magenta' };
    case 'shield': return { text: '◈Shd', color: 'blue' };
    case 'summon': return { text: '+Sum', color: 'magenta' };
    default: return { text: '', color: 'white' };
  }
}

interface StatusTag { text: string; color: string }

function statusTags(enemy: EnemyInstance): StatusTag[] {
  const tags: StatusTag[] = [];
  for (const s of enemy.statusEffects) {
    switch (s.type) {
      case 'vulnerable': tags.push({ text: `vul${s.stacks}`, color: 'yellow' }); break;
      case 'weak': tags.push({ text: `wk${s.stacks}`, color: 'green' }); break;
      case 'burn': tags.push({ text: `brn${s.stacks}`, color: 'red' }); break;
      case 'empowered': tags.push({ text: `pwr${s.stacks}`, color: 'magenta' }); break;
      case 'fortified': tags.push({ text: `frt${s.stacks}`, color: 'blue' }); break;
    }
  }
  return tags;
}

function EnemyCard({ enemy, isTarget }: { enemy: EnemyInstance; isTarget: boolean }) {
  const tmpl = getEnemyTemplate(enemy.templateId);
  const name = tmpl?.name ?? '???';
  const sym = tmpl?.symbol ?? '?';
  const bc = isTarget ? 'yellow' : undefined;
  const bDim = !isTarget;

  const nameTag = `${sym} ${name}`;
  const topFill = Math.max(0, INNER - 1 - nameTag.length);

  const bar = hpBar(enemy.hp, enemy.maxHp, 4);
  const hp = `${enemy.hp}`;
  const intent = intentInfo(enemy.intent);
  const leftContent = ` ${bar} ${hp} `;
  const gap = Math.max(0, INNER - leftContent.length - intent.text.length);

  const tags = statusTags(enemy);
  const tagLen = tags.reduce((a, t) => a + t.text.length + 1, 0);
  const bottomFill = Math.max(0, INNER - tagLen);

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={bc} dimColor={bDim} bold={isTarget}>{'╭─'}</Text>
        <Text color={isTarget ? 'yellow' : 'red'} bold>{nameTag}</Text>
        <Text color={bc} dimColor={bDim}>{'─'.repeat(topFill)}{'╮'}</Text>
      </Text>
      <Text>
        <Text color={bc} dimColor={bDim}>{'│'}</Text>
        <Text color={hpColor(enemy.hp, enemy.maxHp)}>{' '}{bar}</Text>
        <Text bold>{' '}{hp}</Text>
        <Text>{' '.repeat(gap)}</Text>
        <Text color={intent.color} bold>{intent.text}</Text>
        <Text color={bc} dimColor={bDim}>{'│'}</Text>
      </Text>
      <Text>
        <Text color={bc} dimColor={bDim}>{'╰'}</Text>
        {tags.length > 0 ? (
          <>
            {tags.map((t, i) => (
              <React.Fragment key={i}>
                <Text color={bc} dimColor={bDim}>{'─'}</Text>
                <Text color={t.color}>{t.text}</Text>
              </React.Fragment>
            ))}
            <Text color={bc} dimColor={bDim}>{'─'.repeat(bottomFill)}{'╯'}</Text>
          </>
        ) : (
          <Text color={bc} dimColor={bDim}>{'─'.repeat(INNER)}{'╯'}</Text>
        )}
      </Text>
    </Box>
  );
}

function EmptySlot() {
  return (
    <Box flexDirection="column">
      <Text>{' '.repeat(14)}</Text>
      <Text dimColor>{'      ·       '}</Text>
      <Text>{' '.repeat(14)}</Text>
    </Box>
  );
}

function EmplacementCard({ col }: { col: Column }) {
  if (!col.emplacement) {
    return (
      <Box flexDirection="column">
        <Text dimColor>{'╌'.repeat(14)}</Text>
      </Box>
    );
  }
  const empDef = getCardDef(col.emplacement.cardDefId);
  const empName = empDef?.name ?? 'Wall';
  const hp = col.emplacement.hp;
  const bar = hpBar(hp, col.emplacement.maxHp, 4);
  const content = ` ◇${empName} ${bar}${hp}`.padEnd(INNER).slice(0, INNER);

  return (
    <Box flexDirection="column">
      <Text>
        <Text color="cyan">{'╔'}</Text>
        <Text color="cyan">{'═'.repeat(INNER)}</Text>
        <Text color="cyan">{'╗'}</Text>
      </Text>
      <Text>
        <Text color="cyan">{'║'}</Text>
        <Text color="cyan" bold>{content}</Text>
        <Text color="cyan">{'║'}</Text>
      </Text>
      <Text>
        <Text color="cyan">{'╚'}</Text>
        <Text color="cyan">{'═'.repeat(INNER)}</Text>
        <Text color="cyan">{'╝'}</Text>
      </Text>
    </Box>
  );
}

export function CombatGrid({ columns, targetColumn, showTarget, gateHp, gateMaxHp, gateBlock }: CombatGridProps) {
  const gatePercent = gateMaxHp > 0 ? Math.round((gateHp / gateMaxHp) * 100) : 0;
  const gateColor = gatePercent > 60 ? 'green' : gatePercent > 30 ? 'yellow' : 'red';

  return (
    <Box flexDirection="column">
      <Box justifyContent="center">
        <Text dimColor>{'· · · · · · ·  t h e   p a l e  · · · · · · ·'}</Text>
      </Box>

      {showTarget && (
        <Box>
          {columns.map((_, i) => (
            <Box key={i} width={16} justifyContent="center">
              {i === targetColumn
                ? <Text color="yellow" bold>{'  ▼▼▼'}</Text>
                : <Text>{''}</Text>}
            </Box>
          ))}
        </Box>
      )}

      {Array.from({ length: ROWS }, (_, r) => (
        <Box key={r}>
          {columns.map((col, ci) => {
            const enemy = col.enemies.find(e => e.row === r);
            const isTarget = showTarget && ci === targetColumn;
            return (
              <Box key={ci} width={16}>
                {enemy
                  ? <EnemyCard enemy={enemy} isTarget={isTarget} />
                  : <EmptySlot />}
              </Box>
            );
          })}
        </Box>
      ))}

      <Box>
        {columns.map((col, i) => (
          <Box key={i} width={16}>
            <EmplacementCard col={col} />
          </Box>
        ))}
      </Box>

      <Box paddingX={1}>
        <Text bold color={gateColor}>
          {'◆ GATE  '}{hpBar(gateHp, gateMaxHp, 20)}{' '}{gateHp}/{gateMaxHp}
        </Text>
        {gateBlock > 0 && <Text color="cyan">{'   ◇ Block: '}{gateBlock}</Text>}
      </Box>
    </Box>
  );
}
