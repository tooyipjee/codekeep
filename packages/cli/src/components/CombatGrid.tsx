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
  const colWidth = 14;

  const header = columns.map((col, i) => {
    const label = `Col ${i + 1}`;
    const emp = col.emplacement ? `[${col.emplacement.hp}hp]` : '';
    const full = emp ? `${label}${emp}` : label;
    const isTarget = showTarget && i === targetColumn;
    const padded = full.padStart(Math.floor((colWidth + full.length) / 2)).padEnd(colWidth);
    return isTarget ? `[${padded.slice(1, -1)}]` : ` ${padded.slice(1, -1)} `;
  }).join('│');

  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    const cells = columns.map((col) => {
      const enemies = col.enemies.filter((e) => e.row === r);
      if (enemies.length === 0) {
        return '·'.padStart(Math.floor((colWidth + 1) / 2)).padEnd(colWidth);
      }
      const display = enemies.map((e) => {
        const intent = intentLabel(e.intent);
        const statuses = statusIcons(e);
        let txt = enemyDisplay(e);
        if (intent) txt += ` ${intent}`;
        if (statuses) txt += ` ${statuses}`;
        return txt;
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
        {gateBlock > 0 && <Text color="cyan"> ◇{gateBlock}</Text>}
      </Text>
    </Box>
  );
}
