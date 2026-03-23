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

function intentLabel(intent: EnemyInstance['intent']): { text: string; color: string } {
  if (!intent) return { text: '', color: 'white' };
  switch (intent.type) {
    case 'advance': return { text: `↓Mv`, color: 'white' };
    case 'attack': return { text: `⚔${intent.value}`, color: 'red' };
    case 'buff': return { text: `▲Buff`, color: 'magenta' };
    case 'debuff': return { text: `▼Hex`, color: 'magenta' };
    case 'shield': return { text: `◈Shd`, color: 'blue' };
    case 'summon': return { text: `+Call`, color: 'magenta' };
    default: return { text: '', color: 'white' };
  }
}

function statusIcons(enemy: EnemyInstance): { text: string; color: string }[] {
  const tags: { text: string; color: string }[] = [];
  for (const s of enemy.statusEffects) {
    switch (s.type) {
      case 'vulnerable': tags.push({ text: `vul${s.stacks}`, color: 'yellow' }); break;
      case 'weak': tags.push({ text: `wk${s.stacks}`, color: 'green' }); break;
      case 'burn': tags.push({ text: `🔥${s.stacks}`, color: 'red' }); break;
      case 'empowered': tags.push({ text: `pwr${s.stacks}`, color: 'magenta' }); break;
      case 'fortified': tags.push({ text: `frt${s.stacks}`, color: 'blue' }); break;
    }
  }
  return tags;
}

function hpBar(current: number, max: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((current / max) * width)));
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

function enemyDisplay(enemy: EnemyInstance): string {
  const tmpl = getEnemyTemplate(enemy.templateId);
  const sym = tmpl?.symbol ?? '?';
  return `${sym}${enemy.hp}`;
}

export function CombatGrid({ columns, targetColumn, showTarget, gateHp, gateMaxHp, gateBlock }: CombatGridProps) {
  const colWidth = 14;
  const numCols = columns.length;
  const innerWidth = colWidth * numCols + (numCols - 1);

  const gatePercent = gateMaxHp > 0 ? Math.round((gateHp / gateMaxHp) * 100) : 0;
  const gateColor = gatePercent > 60 ? 'green' : gatePercent > 30 ? 'yellow' : 'red';

  const paleLabel = 't h e   p a l e';
  const borderWidth = innerWidth + 2;
  const leftPad = Math.floor((borderWidth - paleLabel.length) / 2);
  const rightPad = borderWidth - leftPad - paleLabel.length;
  const dots = '· '.repeat(40);
  const paleHeader = dots.slice(0, leftPad) + paleLabel + dots.slice(0, rightPad);

  const topBorder = '┌' + Array.from({ length: numCols }, (_, i) =>
    '─'.repeat(colWidth) + (i < numCols - 1 ? '┬' : '')).join('') + '┐';

  const wallTop = '╞' + Array.from({ length: numCols }, (_, i) =>
    '═'.repeat(colWidth) + (i < numCols - 1 ? '╪' : '')).join('') + '╡';

  const wallBot = '╘' + Array.from({ length: numCols }, (_, i) =>
    '═'.repeat(colWidth) + (i < numCols - 1 ? '╧' : '')).join('') + '╛';

  const gateInfo = ` ◆ GATE ${hpBar(gateHp, gateMaxHp, 20)} ${gateHp}/${gateMaxHp}`;
  const blockInfo = gateBlock > 0 ? `  ◇${gateBlock}` : '';

  return (
    <Box flexDirection="column">
      <Text dimColor>{paleHeader}</Text>
      <Text dimColor>{topBorder}</Text>

      {showTarget && (
        <Text>
          <Text dimColor>{'│'}</Text>
          {columns.map((_, i) => {
            const isTarget = i === targetColumn;
            const marker = isTarget ? '▼' : '';
            const cell = marker
              .padStart(Math.ceil((colWidth + marker.length) / 2))
              .padEnd(colWidth);
            return (
              <React.Fragment key={i}>
                <Text color={isTarget ? 'yellow' : undefined} bold={isTarget}>
                  {cell}
                </Text>
                <Text dimColor>{'│'}</Text>
              </React.Fragment>
            );
          })}
        </Text>
      )}

      {Array.from({ length: ROWS }, (_, r) => (
        <Text key={r}>
          <Text dimColor>{'│'}</Text>
          {columns.map((col, i) => {
            const enemies = col.enemies.filter((e) => e.row === r);
            const isTarget = showTarget && i === targetColumn;
            if (enemies.length === 0) {
              const cell = '·'.padStart(Math.floor((colWidth + 1) / 2)).padEnd(colWidth);
              return (
                <React.Fragment key={i}>
                  <Text>{cell}</Text>
                  <Text dimColor>{'│'}</Text>
                </React.Fragment>
              );
            }
            const enemy = enemies[0];
            const sym = getEnemyTemplate(enemy.templateId)?.symbol ?? '?';
            const intent = intentLabel(enemy.intent);
            const statuses = statusIcons(enemy);
            const hpStr = `${enemy.hp}`;
            const baseLen = sym.length + hpStr.length + 1 + (intent.text ? intent.text.length + 1 : 0);
            const statusLen = statuses.reduce((s, t) => s + t.text.length + 1, 0);
            const showStatuses = baseLen + statusLen <= colWidth;

            return (
              <React.Fragment key={i}>
                <Text color={isTarget ? 'yellow' : 'red'} bold>{sym}</Text>
                <Text color={isTarget ? 'yellow' : 'white'}>{hpStr}</Text>
                {intent.text ? <Text color={intent.color}>{' '}{intent.text}</Text> : null}
                {showStatuses && statuses.map((st, si) => (
                  <Text key={si} color={st.color}>{' '}{st.text}</Text>
                ))}
                <Text>{' '.repeat(Math.max(0, colWidth - baseLen - (showStatuses ? statusLen : 0)))}</Text>
                <Text dimColor>{'│'}</Text>
              </React.Fragment>
            );
          })}
        </Text>
      ))}

      <Text>{wallTop}</Text>

      <Text>
        <Text dimColor>{'│'}</Text>
        {columns.map((col, i) => {
          let cell: string;
          if (col.emplacement) {
            const empDef = getCardDef(col.emplacement.cardDefId);
            const empName = empDef?.name ?? 'Wall';
            cell = ` ◇${empName} ${col.emplacement.hp}hp `.padEnd(colWidth).slice(0, colWidth);
          } else {
            cell = ' '.repeat(colWidth);
          }
          return (
            <React.Fragment key={i}>
              <Text color={col.emplacement ? 'cyan' : undefined}>{cell}</Text>
              <Text dimColor>{'│'}</Text>
            </React.Fragment>
          );
        })}
      </Text>

      <Text>{wallBot}</Text>

      <Box paddingX={1}>
        <Text bold color={gateColor}>{gateInfo}</Text>
        {gateBlock > 0 && <Text color="cyan">{blockInfo}</Text>}
      </Box>
    </Box>
  );
}
