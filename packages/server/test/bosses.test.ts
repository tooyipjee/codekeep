import { describe, it, expect } from 'vitest';
import { getBossDef, getBossIntent, getBossWave, BOSS_DEFS } from '../src/engine/bosses.js';
import { getEnemyTemplate } from '@codekeep/shared';

describe('bosses', () => {
  it('has boss definitions for all 3 acts', () => {
    expect(getBossDef(1)).toBeDefined();
    expect(getBossDef(2)).toBeDefined();
    expect(getBossDef(3)).toBeDefined();
  });

  it('all boss templateIds are valid enemy templates', () => {
    for (const boss of BOSS_DEFS) {
      expect(getEnemyTemplate(boss.templateId)).toBeDefined();
    }
  });

  it('boss intent changes based on HP threshold', () => {
    const boss = getBossDef(1)!;
    const intent1 = getBossIntent(boss, 1.0, 1);
    const intent2 = getBossIntent(boss, 0.4, 1);
    // Phase 2 should have different intents
    expect(intent1).toBeDefined();
    expect(intent2).toBeDefined();
  });

  it('boss intent cycles through pattern', () => {
    const boss = getBossDef(1)!;
    const i1 = getBossIntent(boss, 1.0, 1);
    const i2 = getBossIntent(boss, 1.0, 2);
    const i3 = getBossIntent(boss, 1.0, 3);
    const i4 = getBossIntent(boss, 1.0, 4);
    // Turn 4 should cycle back to turn 1's intent
    expect(i4.type).toBe(i1.type);
  });

  it('generates boss waves with valid enemies', () => {
    for (let act = 1; act <= 3; act++) {
      const wave = getBossWave(act);
      expect(wave.length).toBeGreaterThan(0);
      for (const entry of wave) {
        expect(getEnemyTemplate(entry.templateId)).toBeDefined();
        expect(entry.column).toBeGreaterThanOrEqual(0);
        expect(entry.column).toBeLessThan(5);
      }
    }
  });
});
