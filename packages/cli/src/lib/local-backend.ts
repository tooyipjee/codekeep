import type { GameSave } from '@codekeep/shared';
import { loadGame, saveGame, createNewGameSave, deleteSaveFile } from '@codekeep/server';
import type { GameBackend } from './backend.js';

export class LocalBackend implements GameBackend {
  readonly mode = 'local' as const;

  async load(): Promise<GameSave | null> {
    return loadGame();
  }

  async save(save: GameSave): Promise<void> {
    saveGame(save);
  }

  async createNew(playerName: string): Promise<GameSave> {
    return createNewGameSave(playerName);
  }

  async deleteAll(): Promise<boolean> {
    return deleteSaveFile();
  }
}
