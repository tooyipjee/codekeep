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

function intentLabel(intent: EnemyInstance['intent']): string {
  if (!intent) return '';
  switch (intent.type) {
    case 'advance': return `↓${intent.value}`;
    case 'attack': return `⚔${intent.value}`;
    case 'buff': return `▲${intent.value}`;
    case 'debuff': return `▼${intent.value}`;
    case 'shield': return `◈${intent.value}`;
    case 'summon': return `+${intent.value}`;
    default: return '';
  }
}

function statusIcons(enemy: EnemyInstance): string {
  const parts: string[] = [];
  for (const s of enemy.statusEffects) {
    switch (s.type) {
      case 'vulnerable': parts.push(`V${s.stacks}`); break;
      case 'weak': parts.push(`W${s.stacks}`); break;
      case 'burn': parts.push(`B${s.stacks}`); break;
      case 'empowered': parts.push(`E${s.stacks}`); break;
      case 'fortified': parts.push(`F${s.stacks}`); break;
    }
  }
  return parts.join('');
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
            let cell: string;
            if (enemies.length === 0) {
              cell = '·'.padStart(Math.floor((colWidth + 1) / 2)).padEnd(colWidth);
            } else {
              const display = enemies.map((e) => {
                const intent = intentLabel(e.intent);
                const statuses = statusIcons(e);
                let txt = enemyDisplay(e);
                if (intent) txt += ` ${intent}`;
                if (statuses) txt += ` ${statuses}`;
                return txt;
              }).join(' ');
              cell = display.slice(0, colWidth).padEnd(colWidth);
            }
            const isTarget = showTarget && i === targetColumn;
            return (
              <React.Fragment key={i}>
                <Text color={isTarget && enemies.length > 0 ? 'yellow' : undefined}>
                  {cell}
                </Text>
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
