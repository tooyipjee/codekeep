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

function hpBar(current: number, max: number, width: number): string {
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
  const totalWidth = colWidth * columns.length + (columns.length - 1);

  const gatePercent = Math.round((gateHp / gateMaxHp) * 100);
  const gateColor = gatePercent > 60 ? 'green' : gatePercent > 30 ? 'yellow' : 'red';

  return (
    <Box flexDirection="column">
      <Text dimColor>{'┌' + columns.map((_, i) => {
        const isTarget = showTarget && i === targetColumn;
        const label = isTarget ? `  Col ${i + 1}  ` : `  Col ${i + 1}  `;
        return '─'.repeat(Math.floor((colWidth - label.length) / 2)) + label + '─'.repeat(Math.ceil((colWidth - label.length) / 2));
      }).join('┬') + '┐'}</Text>

      {showTarget && (
        <Text>
          {columns.map((_, i) => {
            const isTarget = i === targetColumn;
            const content = isTarget ? '  ▼ TARGET ▼  ' : ' '.repeat(colWidth);
            return (
              <Text key={i} color={isTarget ? 'yellow' : undefined} bold={isTarget}>
                {i === 0 ? '│' : ''}{content.slice(0, colWidth)}{i < columns.length - 1 ? '│' : '│'}
              </Text>
            );
          })}
        </Text>
      )}

      {Array.from({ length: ROWS }, (_, r) => (
        <Text key={r}>
          {columns.map((col, i) => {
            const enemies = col.enemies.filter((e) => e.row === r);
            let cell: string;
            if (enemies.length === 0) {
              cell = r === ROWS - 1 ? '─ ─ ─ ─ ─ ─' : '·'.padStart(Math.floor((colWidth + 1) / 2)).padEnd(colWidth);
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
              <Text key={i} color={isTarget && enemies.length > 0 ? 'yellow' : undefined}>
                {i === 0 ? <Text dimColor>{'│'}</Text> : null}
                {cell}
                <Text dimColor>{'│'}</Text>
              </Text>
            );
          })}
        </Text>
      ))}

      {/* Emplacements row */}
      <Text>
        {columns.map((col, i) => {
          let cell: string;
          if (col.emplacement) {
            cell = ` ◇${col.emplacement.hp}hp `.padEnd(colWidth);
          } else {
            cell = ' '.repeat(colWidth);
          }
          return (
            <Text key={i} color={col.emplacement ? 'cyan' : undefined}>
              {i === 0 ? <Text dimColor>{'│'}</Text> : null}
              {cell}
              <Text dimColor>{'│'}</Text>
            </Text>
          );
        })}
      </Text>

      <Text dimColor>{'└' + '─'.repeat(totalWidth) + '┘'}</Text>

      {/* Gate HP bar */}
      <Box paddingX={1} marginTop={0}>
        <Text bold color={gateColor}>
          {'◆ Gate '}
          {hpBar(gateHp, gateMaxHp, 20)}
          {` ${gateHp}/${gateMaxHp}`}
        </Text>
        {gateBlock > 0 && <Text color="cyan"> ◇{gateBlock}</Text>}
      </Box>
    </Box>
  );
}
