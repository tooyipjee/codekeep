import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: vi.fn(() => actual.homedir()) };
});

import { homedir } from 'node:os';
import * as localStore from '../src/persistence/local-store.js';

describe('persistence — deleteSaveFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codekeep-del-'));
    vi.mocked(homedir).mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns false when no save file exists', () => {
    expect(localStore.deleteSaveFile()).toBe(false);
  });

  it('returns true after deleting existing save', () => {
    const save = localStore.createNewGameSave('DeleteTest');
    localStore.saveGame(save);
    expect(localStore.hasSaveFile()).toBe(true);

    expect(localStore.deleteSaveFile()).toBe(true);
    expect(localStore.hasSaveFile()).toBe(false);
  });

  it('loadGame returns null after delete', () => {
    const save = localStore.createNewGameSave('DeleteTest');
    localStore.saveGame(save);
    localStore.deleteSaveFile();
    expect(localStore.loadGame()).toBeNull();
  });

  it('loadGame returns null when file cannot be read', () => {
    const configDir = join(tempDir, '.config', 'codekeep');
    mkdirSync(configDir, { recursive: true });
    const gamePath = join(configDir, 'game.json');
    mkdirSync(gamePath);

    const loaded = localStore.loadGame();
    expect(loaded).toBeNull();
  });
});
