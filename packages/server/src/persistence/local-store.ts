import type { GameSave, KeepState } from '@codekeep/shared';
import { writeFileSync, readFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const SCHEMA_VERSION = 2;

export function getConfigDir(): string {
  return join(homedir(), '.config', 'codekeep');
}

export function getSavePath(): string {
  return join(getConfigDir(), 'game.json');
}

function defaultKeepState(): KeepState {
  return {
    structures: {},
    npcs: [],
    echoes: 0,
    highestAscension: 0,
    totalRuns: 0,
    totalWins: 0,
    unlockedCardIds: [],
    achievements: [],
    narrativeFlags: [],
  };
}

export function createNewGameSave(playerName: string): GameSave {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAtUnixMs: Date.now(),
    playerName,
    keep: defaultKeepState(),
    activeRun: null,
  };
}

export function saveGame(save: GameSave): void {
  const savePath = getSavePath();
  const dir = dirname(savePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = savePath + '.tmp';
  const data = JSON.stringify({ ...save, savedAtUnixMs: Date.now() }, null, 2);
  writeFileSync(tmpPath, data, 'utf-8');
  renameSync(tmpPath, savePath);
}

export function loadGame(): GameSave | null {
  const savePath = getSavePath();
  if (!existsSync(savePath)) return null;

  let raw: string;
  try {
    raw = readFileSync(savePath, 'utf-8');
  } catch {
    return null;
  }

  let save: GameSave;
  try {
    save = JSON.parse(raw) as GameSave;
  } catch {
    const bakPath = savePath + '.bak';
    try { writeFileSync(bakPath, raw, 'utf-8'); } catch { /* best-effort */ }
    process.stderr.write(`[codekeep] Corrupted save backed up to ${bakPath}\n`);
    return null;
  }

  if (save.schemaVersion !== SCHEMA_VERSION) {
    const bakPath = savePath + `.v${save.schemaVersion}.bak`;
    try { writeFileSync(bakPath, raw, 'utf-8'); } catch { /* best-effort */ }
    process.stderr.write(`[codekeep] Save version mismatch (got ${save.schemaVersion}, need ${SCHEMA_VERSION}), backed up to ${bakPath}\n`);
    return null;
  }

  return save;
}

export function hasSaveFile(): boolean {
  return existsSync(getSavePath());
}

export function deleteSaveFile(): boolean {
  const savePath = getSavePath();
  if (!existsSync(savePath)) return false;
  try {
    unlinkSync(savePath);
    return true;
  } catch {
    return false;
  }
}
