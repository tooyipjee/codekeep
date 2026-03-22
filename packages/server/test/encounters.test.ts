import { describe, it, expect } from 'vitest';
import { pickEncounter, getEncounterPool } from '../src/engine/encounters.js';
import { mulberry32 } from '../src/engine/rng.js';
import { getEnemyTemplate } from '@codekeep/shared';

describe('encounters', () => {
  it('picks a combat encounter for act 1', () => {
    const rng = mulberry32(42);
    const encounter = pickEncounter(1, rng);
    expect(encounter.name).toBeTruthy();
    expect(encounter.enemies.length).toBeGreaterThan(0);
    expect(encounter.isElite).toBe(false);
  });

  it('picks an elite encounter', () => {
    const rng = mulberry32(42);
    const encounter = pickEncounter(1, rng, true);
    expect(encounter.isElite).toBe(true);
    expect(encounter.enemies.length).toBeGreaterThan(0);
  });

  it('has encounter pools for all acts', () => {
    expect(getEncounterPool(1).length).toBeGreaterThan(0);
    expect(getEncounterPool(2).length).toBeGreaterThan(0);
    expect(getEncounterPool(3).length).toBeGreaterThan(0);
  });

  it('all encounters reference valid enemy templates', () => {
    for (let act = 1; act <= 3; act++) {
      for (const enc of getEncounterPool(act)) {
        for (const e of enc.enemies) {
          expect(getEnemyTemplate(e.templateId)).toBeDefined();
        }
      }
    }
  });
});
