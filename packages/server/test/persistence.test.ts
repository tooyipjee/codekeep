import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: vi.fn(() => actual.homedir()) };
});

import { homedir } from 'node:os';
import * as localStore from '../src/persistence/local-store.js';

describe('persistence — save/load', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codekeep-test-'));
    vi.mocked(homedir).mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('save_and_load_roundtrip', () => {
    const save = localStore.createNewGameSave('TestPlayer');
    localStore.saveGame(save);

    const loaded = localStore.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.player.displayName).toBe('TestPlayer');
    expect(loaded!.keep.ownerPlayerId).toBe(save.player.id);
    expect(loaded!.schemaVersion).toBe(save.schemaVersion);
    expect(loaded!.keep.grid.structures).toEqual(save.keep.grid.structures);
    expect(loaded!.tutorialCompleted).toBe(false);
  });

  it('load_returns_null_for_missing_file', () => {
    const loaded = localStore.loadGame();
    expect(loaded).toBeNull();
  });
});
