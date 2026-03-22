import type { EnemyInstance, Intent } from '@codekeep/shared';
import { getEnemyTemplate, COLUMNS } from '@codekeep/shared';

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

export function rollEnemyIntent(enemy: EnemyInstance, rng: () => number): Intent {
  const tmpl = getEnemyTemplate(enemy.templateId);
  if (!tmpl) return { type: 'advance', value: 1 };

  const roll = rng();
  if (roll < 0.5) {
    return { type: 'advance', value: tmpl.speed };
  }
  return { type: 'attack', value: tmpl.damage, targetColumn: enemy.column };
}

export function resetEnemyIdCounter(): void {
  nextEnemyId = 1;
}
