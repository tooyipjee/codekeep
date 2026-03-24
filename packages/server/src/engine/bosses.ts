import type { EnemyInstance, Intent, CombatState } from '@codekeep/shared';
import { spawnEnemy } from './enemies.js';

export interface BossPhase {
  hpThreshold: number;
  intentPattern: Intent[];
}

export interface BossDialogue {
  storyLayer: string;
  onAppear: string;
  onPhaseChange?: string;
  onDefeat?: string;
}

export interface BossDef {
  templateId: string;
  name: string;
  act: number;
  phases: BossPhase[];
  dialogue?: BossDialogue[];
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
    dialogue: [
      { storyLayer: 'surface', onAppear: 'I will stitch this Keep into silence.', onDefeat: 'Unraveled... but the thread remains...' },
      { storyLayer: 'cracks', onAppear: 'You again. How many times have we done this?', onPhaseChange: 'I remember you. Every time.', onDefeat: 'Same ending. Different stitch.' },
      { storyLayer: 'truth', onAppear: 'I was a Warden once. Before the stitching.', onDefeat: 'Free... at last. Until the next stitch.' },
      { storyLayer: 'true_ending', onAppear: 'We were both Wardens. We both chose to hold. The only difference is which side of the stitching we\'re on.', onDefeat: 'The thread... was mine all along.' },
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
        { type: 'shield', value: 3 },
      ] },
      { hpThreshold: 0.5, intentPattern: [
        { type: 'attack', value: 15 },
        { type: 'debuff', value: 3 },
        { type: 'summon', value: 3 },
      ] },
    ],
    dialogue: [
      { storyLayer: 'surface', onAppear: 'Everything must be recorded. Including your defeat.', onDefeat: 'The records... will continue... without me...' },
      { storyLayer: 'cracks', onAppear: 'Sable? Is that... no. Not yet. Not this time.', onDefeat: 'The pages scatter... but the ink remembers.' },
      { storyLayer: 'truth', onAppear: 'I am what Sable will become. I am what the Archive demands.', onDefeat: 'Tell Sable... it doesn\'t have to end this way.' },
      { storyLayer: 'true_ending', onAppear: 'I remember being Sable. It was the last thing I chose to forget.', onDefeat: 'The record is complete. At last.' },
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
        { type: 'attack', value: 16 },
        { type: 'debuff', value: 3 },
        { type: 'attack', value: 12 },
      ] },
      { hpThreshold: 0.3, intentPattern: [
        { type: 'attack', value: 20 },
        { type: 'summon', value: 3 },
        { type: 'attack', value: 16 },
      ] },
    ],
    dialogue: [
      { storyLayer: 'surface', onAppear: 'I am the memory of everything. And everything remembers its end.' },
      { storyLayer: 'cracks', onAppear: "You've learned to read the patterns. But patterns are cages too." },
      { storyLayer: 'truth', onAppear: 'The Architect made me to preserve. I preserved so perfectly that nothing could change. Is that not love?' },
      { storyLayer: 'true_ending', onAppear: 'You carry the same question the Architect carried. The answer hasn\'t changed. Only the one asking.' },
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

export function getBossPhaseIndex(boss: BossDef, hpPercent: number): number {
  let phaseIdx = 0;
  for (let i = 0; i < boss.phases.length; i++) {
    if (hpPercent <= boss.phases[i].hpThreshold) phaseIdx = i;
  }
  return phaseIdx;
}

export function getBossIntent(
  boss: BossDef,
  hpPercent: number,
  turn: number,
  state?: CombatState,
  enemy?: EnemyInstance,
): Intent {
  const phaseIdx = getBossPhaseIndex(boss, hpPercent);

  if (boss.onPhaseChange && state && enemy) {
    const lastPhase = enemy.bossPhase ?? 0;
    if (phaseIdx > lastPhase) {
      boss.onPhaseChange(state, enemy, phaseIdx);
      enemy.bossPhase = phaseIdx;
    }
  }

  const phase = boss.phases[phaseIdx];
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
