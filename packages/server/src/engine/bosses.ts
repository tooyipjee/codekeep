import type { EnemyInstance, Intent, CombatState } from '@codekeep/shared';
import { spawnEnemy } from './enemies.js';

export interface BossPhase {
  hpThreshold: number;
  intentPattern: Intent[];
}

export interface BossDef {
  templateId: string;
  name: string;
  act: number;
  phases: BossPhase[];
  onPhaseChange?: (state: CombatState, boss: EnemyInstance, phase: number) => void;
}

export const BOSS_DEFS: BossDef[] = [
  {
    templateId: 'boss_suture', name: 'The Suture', act: 1,
    phases: [
      { hpThreshold: 1.0, intentPattern: [
        { type: 'attack', value: 8 },
        { type: 'advance', value: 1 },
        { type: 'attack', value: 12 },
      ] },
      { hpThreshold: 0.5, intentPattern: [
        { type: 'attack', value: 15 },
        { type: 'summon', value: 2 },
        { type: 'attack', value: 10 },
      ] },
    ],
    onPhaseChange: (state, _boss, _phase) => {
      const col = state.columns[2];
      if (col.enemies.length < 3) {
        col.enemies.push(spawnEnemy('needle', 2));
      }
    },
  },
  {
    templateId: 'boss_archivist', name: 'The Archivist', act: 2,
    phases: [
      { hpThreshold: 1.0, intentPattern: [
        { type: 'debuff', value: 2 },
        { type: 'attack', value: 10 },
        { type: 'shield', value: 15 },
      ] },
      { hpThreshold: 0.5, intentPattern: [
        { type: 'attack', value: 18 },
        { type: 'debuff', value: 3 },
        { type: 'summon', value: 3 },
      ] },
    ],
  },
  {
    templateId: 'boss_pale', name: 'The Pale Itself', act: 3,
    phases: [
      { hpThreshold: 1.0, intentPattern: [
        { type: 'attack', value: 12 },
        { type: 'advance', value: 1 },
        { type: 'summon', value: 2 },
      ] },
      { hpThreshold: 0.6, intentPattern: [
        { type: 'attack', value: 20 },
        { type: 'debuff', value: 3 },
        { type: 'attack', value: 15 },
      ] },
      { hpThreshold: 0.3, intentPattern: [
        { type: 'attack', value: 25 },
        { type: 'summon', value: 3 },
        { type: 'attack', value: 20 },
      ] },
    ],
    onPhaseChange: (state, _boss, phase) => {
      if (phase >= 2) {
        for (const col of state.columns) {
          for (const enemy of col.enemies) {
            const emp = enemy.statusEffects.find((s) => s.type === 'empowered');
            if (emp) emp.stacks += 1;
            else enemy.statusEffects.push({ type: 'empowered', stacks: 1, duration: 99 });
          }
        }
      }
    },
  },
];

export function getBossDef(act: number): BossDef | undefined {
  return BOSS_DEFS.find((b) => b.act === act);
}

export function getBossIntent(boss: BossDef, hpPercent: number, turn: number): Intent {
  let phase = boss.phases[0];
  for (const p of boss.phases) {
    if (hpPercent <= p.hpThreshold) phase = p;
  }
  const idx = (turn - 1) % phase.intentPattern.length;
  return phase.intentPattern[idx];
}

export function getBossWave(act: number): { templateId: string; column: number }[] {
  switch (act) {
    case 1: return [
      { templateId: 'boss_suture', column: 2 },
      { templateId: 'hollow', column: 0 },
      { templateId: 'hollow', column: 4 },
    ];
    case 2: return [
      { templateId: 'boss_archivist', column: 2 },
      { templateId: 'wraith', column: 1 },
      { templateId: 'wraith', column: 3 },
    ];
    case 3: return [
      { templateId: 'boss_pale', column: 2 },
      { templateId: 'echo', column: 0 },
      { templateId: 'echo', column: 4 },
    ];
    default: return [{ templateId: 'boss_suture', column: 2 }];
  }
}
