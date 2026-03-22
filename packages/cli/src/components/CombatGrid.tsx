import React from 'react';
import { Box, Text } from 'ink';
import type { Column, EnemyInstance } from '@codekeep/shared';
import { getEnemyTemplate, ROWS } from '@codekeep/shared';

interface CombatGridProps {
  columns: Column[];
  targetColumn: number;
  showTarget: boolean;
  gateHp: number;
  gateMaxHp: number;
  gateBlock: number;
}

function intentIcon(intent: EnemyInstance['intent']): string {
  if (!intent) return '?';
  switch (intent.type) {
    case 'advance': return '↓';
    case 'attack': return '⚔';
    case 'buff': return '▲';
    case 'debuff': return '▼';
    case 'shield': return '◈';
    case 'summon': return '+';
    default: return '?';
  }
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

function hpBar(current: number, max: number, width: number = 6): string {
  const filled = Math.max(0, Math.round((current / max) * width));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function enemyDisplay(enemy: EnemyInstance): string {
  const tmpl = getEnemyTemplate(enemy.templateId);
  const sym = tmpl?.symbol ?? '?';
  return `${sym}${enemy.hp}`;
}

export function CombatGrid({ columns, targetColumn, showTarget, gateHp, gateMaxHp, gateBlock }: CombatGridProps) {
  const colWidth = 12;

  const header = columns.map((col, i) => {
    const label = `Col ${i + 1}`;
    const isTarget = showTarget && i === targetColumn;
    const padded = label.padStart(Math.floor((colWidth + label.length) / 2)).padEnd(colWidth);
    return isTarget ? `[${padded.slice(1, -1)}]` : ` ${padded.slice(1, -1)} `;
  }).join('│');

  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    const cells = columns.map((col) => {
      const enemies = col.enemies.filter((e) => e.row === r);
      if (enemies.length === 0) {
        const hasCursor = col.emplacement && r === ROWS - 1;
        if (hasCursor) {
          return `[EMPL]`.padStart(Math.floor((colWidth + 6) / 2)).padEnd(colWidth);
        }
        return '·'.padStart(Math.floor((colWidth + 1) / 2)).padEnd(colWidth);
      }
      const display = enemies.map((e) => {
        const intent = intentLabel(e.intent);
        return `${enemyDisplay(e)}${intent ? ' ' + intent : ''}`;
      }).join(' ');
      return display.slice(0, colWidth).padEnd(colWidth);
    }).join('│');
    rows.push(cells);
  }

  const gatePercent = Math.round((gateHp / gateMaxHp) * 100);
  const gateColor = gatePercent > 60 ? 'green' : gatePercent > 30 ? 'yellow' : 'red';

  return (
    <Box flexDirection="column">
      <Text bold dimColor>{'─'.repeat(colWidth * 5 + 4)}</Text>
      <Text bold>{header}</Text>
      <Text dimColor>{'─'.repeat(colWidth * 5 + 4)}</Text>
      {rows.map((row, i) => (
        <Text key={i}>{row}</Text>
      ))}
      <Text dimColor>{'═'.repeat(colWidth * 5 + 4)}</Text>
      <Text>
        <Text bold color={gateColor}>Gate {hpBar(gateHp, gateMaxHp, 12)} {gateHp}/{gateMaxHp}</Text>
        {gateBlock > 0 && <Text color="cyan"> 🛡{gateBlock}</Text>}
      </Text>
    </Box>
  );
}
