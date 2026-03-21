import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return { ...actual, homedir: vi.fn(() => actual.homedir()) };
});

import { homedir } from 'node:os';
import * as localStore from '../src/persistence/local-store.js';

describe('persistence — edge cases', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codekeep-edge-'));
    vi.mocked(homedir).mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('hasSaveFile_returns_false_when_no_save', () => {
    expect(localStore.hasSaveFile()).toBe(false);
  });

  it('hasSaveFile_returns_true_after_save', () => {
    const save = localStore.createNewGameSave('TestPlayer');
    localStore.saveGame(save);
    expect(localStore.hasSaveFile()).toBe(true);
  });

  it('loadGame_returns_null_for_corrupted_json', () => {
    const configDir = join(tempDir, '.config', 'codekeep');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'game.json'), '{ invalid json ???', 'utf-8');

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const loaded = localStore.loadGame();
    expect(loaded).toBeNull();

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Corrupted save'),
    );

    const bakPath = join(configDir, 'game.json.bak');
    expect(existsSync(bakPath)).toBe(true);
    stderrSpy.mockRestore();
  });

  it('loadGame_returns_null_for_schema_version_mismatch', () => {
    const configDir = join(tempDir, '.config', 'codekeep');
    mkdirSync(configDir, { recursive: true });
    const badSave = { ...localStore.createNewGameSave('V0'), schemaVersion: 99 };
    writeFileSync(join(configDir, 'game.json'), JSON.stringify(badSave), 'utf-8');

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const loaded = localStore.loadGame();
    expect(loaded).toBeNull();

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Save version mismatch'),
    );

    const bakPath = join(configDir, 'game.json.v99.bak');
    expect(existsSync(bakPath)).toBe(true);
    stderrSpy.mockRestore();
  });

  it('createNewGameSave_has_correct_initial_progression', () => {
    const save = localStore.createNewGameSave('ProgressTest');

    expect(save.progression.achievements).toEqual([]);
    expect(save.progression.totalProbesKilledByScanner).toBe(0);
    expect(save.progression.totalRaidsWon).toBe(0);
    expect(save.progression.totalRaidsLost).toBe(0);
    expect(save.progression.currentWinStreak).toBe(0);
    expect(save.progression.bestWinStreak).toBe(0);
    expect(save.progression.totalStructuresPlaced).toBe(0);
    expect(save.lastPlayedAtUnixMs).toBeGreaterThan(0);
    expect(save.tutorialCompleted).toBe(false);
  });

  it('saveGame_creates_config_directory_if_missing', () => {
    const configDir = join(tempDir, '.config', 'codekeep');
    expect(existsSync(configDir)).toBe(false);

    const save = localStore.createNewGameSave('DirTest');
    localStore.saveGame(save);

    expect(existsSync(configDir)).toBe(true);
    expect(localStore.hasSaveFile()).toBe(true);
  });

  it('getConfigDir_returns_path_under_homedir', () => {
    const dir = localStore.getConfigDir();
    expect(dir).toContain('.config');
    expect(dir).toContain('codekeep');
  });

  it('save_roundtrip_preserves_progression_fields', () => {
    const save = localStore.createNewGameSave('RoundTrip');
    save.progression.totalRaidsWon = 5;
    save.progression.achievements = ['first_structure', 'defense_win_5'];
    save.progression.totalProbesKilledByScanner = 12;
    save.progression.bestWinStreak = 3;
    localStore.saveGame(save);

    const loaded = localStore.loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.progression.totalRaidsWon).toBe(5);
    expect(loaded!.progression.achievements).toEqual(['first_structure', 'defense_win_5']);
    expect(loaded!.progression.totalProbesKilledByScanner).toBe(12);
    expect(loaded!.progression.bestWinStreak).toBe(3);
  });
});
