import { describe, it, expect } from 'vitest';
import { MAX_ASCENSION, ASCENSION_MODIFIERS, getActiveModifiers, canAscend } from '../src/engine/ascension.js';

describe('ascension', () => {
  it('max ascension is 15', () => {
    expect(MAX_ASCENSION).toBe(15);
  });

  it('has 15 ascension modifiers', () => {
    expect(ASCENSION_MODIFIERS.length).toBe(15);
  });

  it('modifier levels are 1 through 15', () => {
    for (let i = 0; i < ASCENSION_MODIFIERS.length; i++) {
      expect(ASCENSION_MODIFIERS[i].level).toBe(i + 1);
    }
  });

  it('getActiveModifiers returns correct count', () => {
    expect(getActiveModifiers(0).length).toBe(0);
    expect(getActiveModifiers(5).length).toBe(5);
    expect(getActiveModifiers(15).length).toBe(15);
  });

  it('can ascend after a win below max', () => {
    expect(canAscend(0, true)).toBe(true);
    expect(canAscend(14, true)).toBe(true);
  });

  it('cannot ascend at max level', () => {
    expect(canAscend(15, true)).toBe(false);
  });

  it('cannot ascend after a loss', () => {
    expect(canAscend(0, false)).toBe(false);
  });
});
