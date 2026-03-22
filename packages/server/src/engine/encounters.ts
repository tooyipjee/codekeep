import type { EnemyTemplate } from '@codekeep/shared';
import { ENEMY_TEMPLATES } from '@codekeep/shared';

export interface Encounter {
  name: string;
  enemies: { templateId: string; column: number }[];
  isElite: boolean;
}

const ACT1_ENCOUNTERS: Omit<Encounter, 'isElite'>[] = [
  { name: 'Scout Party', enemies: [
    { templateId: 'hollow', column: 1 }, { templateId: 'hollow', column: 3 },
  ] },
  { name: 'Swift Assault', enemies: [
    { templateId: 'needle', column: 0 }, { templateId: 'needle', column: 2 }, { templateId: 'needle', column: 4 },
  ] },
  { name: 'Pale Vanguard', enemies: [
    { templateId: 'hollow', column: 1 }, { templateId: 'hollow', column: 3 }, { templateId: 'needle', column: 2 },
  ] },
  { name: 'Wisp Swarm', enemies: [
    { templateId: 'wisp', column: 0 }, { templateId: 'wisp', column: 1 }, { templateId: 'wisp', column: 2 },
    { templateId: 'wisp', column: 3 }, { templateId: 'wisp', column: 4 },
  ] },
  { name: 'Heavy Patrol', enemies: [
    { templateId: 'shade', column: 1 }, { templateId: 'hollow', column: 3 },
  ] },
  { name: 'Armored Column', enemies: [
    { templateId: 'husk', column: 2 }, { templateId: 'wisp', column: 0 }, { templateId: 'wisp', column: 4 },
  ] },
  { name: 'Pale Scouts', enemies: [
    { templateId: 'wisp', column: 0 }, { templateId: 'wisp', column: 4 }, { templateId: 'hollow', column: 2 },
  ] },
  { name: 'Needle Formation', enemies: [
    { templateId: 'needle', column: 1 }, { templateId: 'needle', column: 3 },
  ] },
  { name: 'Husk Advance', enemies: [
    { templateId: 'husk', column: 2 }, { templateId: 'wisp', column: 1 }, { templateId: 'wisp', column: 3 },
  ] },
  { name: 'Shadow Patrol', enemies: [
    { templateId: 'shade', column: 0 }, { templateId: 'needle', column: 4 },
  ] },
  { name: 'Swarm Tide', enemies: [
    { templateId: 'wisp', column: 0 }, { templateId: 'wisp', column: 1 }, { templateId: 'hollow', column: 2 },
    { templateId: 'wisp', column: 3 }, { templateId: 'wisp', column: 4 },
  ] },
  { name: 'Hollow Shields', enemies: [
    { templateId: 'hollow', column: 1 }, { templateId: 'hollow', column: 2 }, { templateId: 'hollow', column: 3 },
  ] },
  { name: 'Fast Assault', enemies: [
    { templateId: 'needle', column: 0 }, { templateId: 'needle', column: 2 }, { templateId: 'needle', column: 4 },
  ] },
  { name: 'Pale Sentries', enemies: [
    { templateId: 'shade', column: 2 }, { templateId: 'hollow', column: 0 }, { templateId: 'hollow', column: 4 },
  ] },
];

const ACT1_ELITES: Omit<Encounter, 'isElite'>[] = [
  { name: 'The Dark Tide', enemies: [
    { templateId: 'shade', column: 1 }, { templateId: 'shade', column: 3 }, { templateId: 'needle', column: 2 },
  ] },
  { name: 'Hollow Legion', enemies: [
    { templateId: 'hollow', column: 0 }, { templateId: 'hollow', column: 1 },
    { templateId: 'hollow', column: 3 }, { templateId: 'hollow', column: 4 },
  ] },
  { name: 'Husk Fortress', enemies: [
    { templateId: 'husk', column: 1 }, { templateId: 'husk', column: 3 }, { templateId: 'needle', column: 2 },
  ] },
  { name: 'Shade Ambush', enemies: [
    { templateId: 'shade', column: 0 }, { templateId: 'shade', column: 2 }, { templateId: 'shade', column: 4 },
  ] },
];

const ACT2_ELITES: Omit<Encounter, 'isElite'>[] = [
  { name: 'The Warband', enemies: [
    { templateId: 'breaker', column: 2 }, { templateId: 'shielder', column: 1 }, { templateId: 'shielder', column: 3 },
  ] },
  { name: 'Flanking Ambush', enemies: [
    { templateId: 'flanker', column: 0 }, { templateId: 'flanker', column: 4 },
    { templateId: 'wraith', column: 2 },
  ] },
  { name: 'Breaker Vanguard', enemies: [
    { templateId: 'breaker', column: 1 }, { templateId: 'breaker', column: 3 }, { templateId: 'shielder', column: 2 },
  ] },
  { name: 'Phantom Blitz', enemies: [
    { templateId: 'wraith', column: 0 }, { templateId: 'wraith', column: 1 }, { templateId: 'wraith', column: 3 }, { templateId: 'wraith', column: 4 },
  ] },
];

const ACT3_ELITES: Omit<Encounter, 'isElite'>[] = [
  { name: 'Echo Vanguard', enemies: [
    { templateId: 'echo', column: 1 }, { templateId: 'echo', column: 3 },
  ] },
  { name: 'The Final Test', enemies: [
    { templateId: 'echo', column: 2 }, { templateId: 'breaker', column: 0 }, { templateId: 'flanker', column: 4 },
  ] },
  { name: 'Memory Siege', enemies: [
    { templateId: 'echo', column: 0 }, { templateId: 'echo', column: 2 }, { templateId: 'echo', column: 4 },
  ] },
  { name: 'The Pale Tribunal', enemies: [
    { templateId: 'echo', column: 1 }, { templateId: 'echo', column: 2 }, { templateId: 'echo', column: 3 },
    { templateId: 'breaker', column: 0 },
  ] },
];

const ACT2_ENCOUNTERS: Omit<Encounter, 'isElite'>[] = [
  { name: 'Wraith Drift', enemies: [
    { templateId: 'wraith', column: 1 }, { templateId: 'wraith', column: 3 },
  ] },
  { name: 'Breach Team', enemies: [
    { templateId: 'breaker', column: 2 }, { templateId: 'flanker', column: 0 }, { templateId: 'flanker', column: 4 },
  ] },
  { name: 'Shield Wall', enemies: [
    { templateId: 'shielder', column: 2 }, { templateId: 'hollow', column: 1 }, { templateId: 'hollow', column: 3 },
  ] },
  { name: 'Wraith Surge', enemies: [
    { templateId: 'wraith', column: 0 }, { templateId: 'wraith', column: 2 }, { templateId: 'wraith', column: 4 },
  ] },
  { name: 'Flanker Pair', enemies: [
    { templateId: 'flanker', column: 1 }, { templateId: 'flanker', column: 3 },
  ] },
  { name: 'Shielder Escort', enemies: [
    { templateId: 'shielder', column: 2 }, { templateId: 'breaker', column: 1 }, { templateId: 'hollow', column: 3 },
  ] },
  { name: 'Pale Vanguard II', enemies: [
    { templateId: 'breaker', column: 0 }, { templateId: 'flanker', column: 2 }, { templateId: 'shielder', column: 4 },
  ] },
  { name: 'Wraith Patrol', enemies: [
    { templateId: 'wraith', column: 1 }, { templateId: 'hollow', column: 0 }, { templateId: 'hollow', column: 4 },
  ] },
  { name: 'Breaker Column', enemies: [
    { templateId: 'breaker', column: 2 }, { templateId: 'wisp', column: 0 }, { templateId: 'wisp', column: 1 },
    { templateId: 'wisp', column: 3 }, { templateId: 'wisp', column: 4 },
  ] },
  { name: 'Shield Formation', enemies: [
    { templateId: 'shielder', column: 1 }, { templateId: 'shielder', column: 3 }, { templateId: 'flanker', column: 2 },
  ] },
  { name: 'Assault Wave', enemies: [
    { templateId: 'breaker', column: 1 }, { templateId: 'breaker', column: 3 },
  ] },
  { name: 'Night Raid', enemies: [
    { templateId: 'wraith', column: 0 }, { templateId: 'flanker', column: 2 }, { templateId: 'wraith', column: 4 },
  ] },
  { name: 'Armored Push', enemies: [
    { templateId: 'shielder', column: 0 }, { templateId: 'breaker', column: 2 }, { templateId: 'shielder', column: 4 },
  ] },
];

const ACT3_ENCOUNTERS: Omit<Encounter, 'isElite'>[] = [
  { name: 'Echoes of the End', enemies: [
    { templateId: 'echo', column: 1 }, { templateId: 'echo', column: 3 },
  ] },
  { name: 'Final Surge', enemies: [
    { templateId: 'echo', column: 2 }, { templateId: 'wraith', column: 0 }, { templateId: 'wraith', column: 4 },
    { templateId: 'breaker', column: 1 },
  ] },
  { name: 'Echo Patrol', enemies: [
    { templateId: 'echo', column: 0 }, { templateId: 'echo', column: 4 },
  ] },
  { name: 'Pale Convergence', enemies: [
    { templateId: 'echo', column: 2 }, { templateId: 'wraith', column: 1 }, { templateId: 'wraith', column: 3 },
  ] },
  { name: 'Void March', enemies: [
    { templateId: 'echo', column: 1 }, { templateId: 'echo', column: 3 }, { templateId: 'breaker', column: 2 },
  ] },
  { name: 'Shadow Tide', enemies: [
    { templateId: 'wraith', column: 0 }, { templateId: 'echo', column: 2 }, { templateId: 'flanker', column: 4 },
  ] },
  { name: 'The Unnamed', enemies: [
    { templateId: 'echo', column: 2 }, { templateId: 'shielder', column: 1 }, { templateId: 'shielder', column: 3 },
  ] },
  { name: 'Pale Hammer', enemies: [
    { templateId: 'breaker', column: 0 }, { templateId: 'echo', column: 2 }, { templateId: 'breaker', column: 4 },
  ] },
  { name: 'Memory Storm', enemies: [
    { templateId: 'echo', column: 0 }, { templateId: 'echo', column: 1 }, { templateId: 'echo', column: 3 }, { templateId: 'echo', column: 4 },
  ] },
  { name: 'Wraith Flood', enemies: [
    { templateId: 'wraith', column: 0 }, { templateId: 'wraith', column: 1 }, { templateId: 'wraith', column: 2 },
    { templateId: 'wraith', column: 3 }, { templateId: 'wraith', column: 4 },
  ] },
  { name: 'Final Guard', enemies: [
    { templateId: 'echo', column: 1 }, { templateId: 'breaker', column: 2 }, { templateId: 'echo', column: 3 },
  ] },
  { name: 'Pale Assembly', enemies: [
    { templateId: 'echo', column: 0 }, { templateId: 'shielder', column: 2 }, { templateId: 'echo', column: 4 },
    { templateId: 'flanker', column: 1 },
  ] },
];

export function pickEncounter(act: number, rng: () => number, isElite: boolean = false): Encounter {
  let pool: Omit<Encounter, 'isElite'>[];
  if (isElite) {
    switch (act) {
      case 2: pool = ACT2_ELITES; break;
      case 3: pool = ACT3_ELITES; break;
      default: pool = ACT1_ELITES; break;
    }
  } else {
    switch (act) {
      case 2: pool = ACT2_ENCOUNTERS; break;
      case 3: pool = ACT3_ENCOUNTERS; break;
      default: pool = ACT1_ENCOUNTERS; break;
    }
  }
  const idx = Math.floor(rng() * pool.length);
  return { ...pool[idx], isElite };
}

export function getEncounterPool(act: number): Omit<Encounter, 'isElite'>[] {
  switch (act) {
    case 2: return ACT2_ENCOUNTERS;
    case 3: return ACT3_ENCOUNTERS;
    default: return ACT1_ENCOUNTERS;
  }
}
