import type { EnemyInstance, Intent, CombatState } from '@codekeep/shared';
import { getEnemyTemplate, COLUMNS } from '@codekeep/shared';
import { getBossDef, getBossIntent } from './bosses.js';

let nextEnemyId = 1;

export function spawnEnemy(templateId: string, column: number): EnemyInstance {
  const tmpl = getEnemyTemplate(templateId);
  if (!tmpl) throw new Error(`Unknown enemy template: ${templateId}`);
  return {
    instanceId: `enemy-${nextEnemyId++}`,
    templateId,
    hp: tmpl.hp,
    maxHp: tmpl.hp,
    column: Math.max(0, Math.min(column, COLUMNS - 1)),
    row: 0,
    intent: null,
    statusEffects: [],
  };
}

export function rollEnemyIntent(
  enemy: EnemyInstance,
  rng: () => number,
  turn: number = 1,
  columnHasEmplacement: boolean = false,
  state?: CombatState,
): Intent {
  const tmpl = getEnemyTemplate(enemy.templateId);
  if (!tmpl) return { type: 'advance', value: 1 };

  const bossDef = getBossDef(tmpl.act);
  if (bossDef && bossDef.templateId === enemy.templateId) {
    const hpPercent = enemy.hp / enemy.maxHp;
    return getBossIntent(bossDef, hpPercent, turn, state, enemy);
  }

  const roll = rng();

  switch (enemy.templateId) {
    case 'shielder':
      if (roll < 0.3) return { type: 'shield', value: 5 };
      if (roll < 0.6) return { type: 'advance', value: tmpl.speed };
      return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };

    case 'flanker': {
      if (roll < 0.4) {
        return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };
      }
      if (roll < 0.7) return { type: 'advance', value: tmpl.speed };
      return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };
    }

    case 'breaker':
      if (columnHasEmplacement) {
        return { type: 'advance', value: tmpl.speed };
      }
      if (roll < 0.6) return { type: 'advance', value: tmpl.speed };
      return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };

    case 'wraith':
      if (roll < 0.4) return { type: 'advance', value: tmpl.speed };
      return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };

    case 'echo':
      if (roll < 0.3) return { type: 'buff', value: 1 };
      if (roll < 0.6) return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };
      return { type: 'advance', value: tmpl.speed };

    default:
      if (roll < 0.5) return { type: 'advance', value: tmpl.speed };
      return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };
  }
}

export function resetEnemyIdCounter(): void {
  nextEnemyId = 1;
}

export function syncEnemyIdCounter(columns: { enemies: EnemyInstance[] }[]): void {
  let max = 0;
  for (const col of columns) {
    for (const e of col.enemies) {
      const m = e.instanceId.match(/^enemy-(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  if (max >= nextEnemyId) nextEnemyId = max + 1;
}
