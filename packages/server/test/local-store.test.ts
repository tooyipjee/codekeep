import { describe, it, expect } from 'vitest';
import { createNewGameSave } from '../src/persistence/local-store.js';

describe('local-store', () => {
  it('creates a new game save with correct structure', () => {
    const save = createNewGameSave('TestPlayer');
    expect(save.schemaVersion).toBe(2);
    expect(save.playerName).toBe('TestPlayer');
    expect(save.keep.echoes).toBe(0);
    expect(save.keep.totalRuns).toBe(0);
    expect(save.activeRun).toBeNull();
  });

  it('has proper initial keep state', () => {
    const save = createNewGameSave('Player');
    expect(save.keep.npcs).toEqual([]);
    expect(save.keep.structures).toEqual({});
    expect(save.keep.highestAscension).toBe(0);
    expect(save.keep.unlockedCardIds).toEqual([]);
    expect(save.keep.narrativeFlags).toEqual([]);
  });
});
