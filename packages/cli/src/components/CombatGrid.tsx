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
  inspectCol?: number;
  inspectEnemyIdx?: number;
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
  const all: StatusTag[] = [];
  for (const s of enemy.statusEffects) {
    switch (s.type) {
      case 'vulnerable': all.push({ text: `V${s.stacks}`, color: 'yellow' }); break;
      case 'weak': all.push({ text: `W${s.stacks}`, color: 'green' }); break;
      case 'burn': all.push({ text: `B${s.stacks}`, color: 'red' }); break;
      case 'empowered': all.push({ text: `E${s.stacks}`, color: 'magenta' }); break;
      case 'fortified': all.push({ text: `F${s.stacks}`, color: 'blue' }); break;
    }
  }
  let used = 0;
  const visible: StatusTag[] = [];
  for (const t of all) {
    if (used + t.text.length + 1 > INNER) break;
    visible.push(t);
    used += t.text.length + 1;
  }
  return visible;
}

function EnemyCard({ enemy, isPrimaryTarget, isInColumn, isInspected }: { enemy: EnemyInstance; isPrimaryTarget: boolean; isInColumn: boolean; isInspected: boolean }) {
  const tmpl = getEnemyTemplate(enemy.templateId);
  const name = tmpl?.name ?? '???';
  const sym = tmpl?.symbol ?? '?';
  const bc = isInspected ? 'cyan' : isPrimaryTarget ? 'yellow' : isInColumn ? 'yellow' : undefined;
  const bDim = !isPrimaryTarget && !isInColumn && !isInspected;

  const nameTag = `${sym} ${name}`;
  const maxNameLen = INNER - 1;
  const displayTag = nameTag.length > maxNameLen
    ? nameTag.slice(0, maxNameLen - 1) + '…'
    : nameTag;
  const topFill = Math.max(0, INNER - 1 - displayTag.length);

  const bar = hpBar(enemy.hp, enemy.maxHp, 4);
  const hp = `${enemy.hp}`;
  const intent = intentInfo(enemy.intent);
  const leftWidth = 1 + 4 + 1 + hp.length;
  const gap = Math.max(0, INNER - leftWidth - intent.text.length);

  const tags = statusTags(enemy);
  const tagLen = tags.reduce((a, t) => a + t.text.length + 1, 0);
  const bottomFill = Math.max(0, INNER - tagLen);

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={bc} dimColor={bDim} bold={isPrimaryTarget || isInspected}>{'╭─'}</Text>
        <Text color={isInspected ? 'cyan' : isPrimaryTarget ? 'yellow' : 'red'} bold>{displayTag}</Text>
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
        <Text>{' '.repeat(INNER + 2)}</Text>
        <Text dimColor>{'  '}{'╌'.repeat(INNER - 2)}{'  '}</Text>
        <Text>{' '.repeat(INNER + 2)}</Text>
      </Box>
    );
  }
  const empDef = getCardDef(col.emplacement.cardDefId);
  const rawName = empDef?.name ?? 'Wall';
  const hp = col.emplacement.hp;
  const bar = hpBar(hp, col.emplacement.maxHp, 4);
  const hpStr = `${hp}`;
  const fixedLen = 3 + 1 + 4 + hpStr.length; // " ◇" + space + bar + hp
  const maxName = INNER - fixedLen;
  const empName = rawName.length > maxName ? rawName.slice(0, Math.max(1, maxName - 1)) + '…' : rawName;
  const content = ` ◇${empName} ${bar}${hpStr}`.padEnd(INNER).slice(0, INNER);

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

export function CombatGrid({ columns, targetColumn, showTarget, gateHp, gateMaxHp, gateBlock, inspectCol, inspectEnemyIdx }: CombatGridProps) {
  const gatePercent = gateMaxHp > 0 ? Math.round((gateHp / gateMaxHp) * 100) : 0;
  const gateColor = gatePercent > 60 ? 'green' : gatePercent > 30 ? 'yellow' : 'red';

  const frontEnemyIds = new Set<string>();
  for (const col of columns) {
    if (col.enemies.length > 0) {
      const front = col.enemies.reduce((a, b) => (a.row >= b.row ? a : b));
      frontEnemyIds.add(front.instanceId);
    }
  }

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
            const isInColumn = showTarget && ci === targetColumn;
            const isPrimary = isInColumn && !!enemy && frontEnemyIds.has(enemy.instanceId);
            const isInspected = inspectCol === ci && !!enemy && col.enemies.indexOf(enemy) === (inspectEnemyIdx ?? -1);
            return (
              <Box key={ci} width={16}>
                {enemy
                  ? <EnemyCard enemy={enemy} isPrimaryTarget={isPrimary} isInColumn={isInColumn && !isPrimary} isInspected={isInspected} />
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
