import type { GameSave } from '@codekeep/shared';
import { GRID_SIZE, STRUCTURE_SYMBOLS, EMPTY_CELL_SYMBOL } from '@codekeep/shared';
import { hashSeed } from '@codekeep/server';

export function generatePostcard(save: GameSave): string {
  const grid = save.keep.grid;
  const p = save.progression;
  const r = save.keep.resources;

  const border = '┌' + '─'.repeat(GRID_SIZE + 2) + '┐';
  const bottom = '└' + '─'.repeat(GRID_SIZE + 2) + '┘';

  const lines: string[] = [];
  lines.push(border);

  for (let y = 0; y < GRID_SIZE; y++) {
    let row = '│ ';
    for (let x = 0; x < GRID_SIZE; x++) {
      const structure = grid.structures.find((s) => s.pos.x === x && s.pos.y === y);
      if (structure) {
        const sym = STRUCTURE_SYMBOLS[structure.kind] ?? '?';
        row += structure.level === 3 ? sym.toUpperCase() : sym;
      } else {
        row += EMPTY_CELL_SYMBOL;
      }
    }
    row += ' │';
    lines.push(row);
  }

  lines.push(bottom);

  const name = save.player.displayName || 'Anonymous';
  const age = Math.max(1, Math.floor((Date.now() - save.keep.createdAtUnixMs) / 86_400_000));
  const raids = p.totalRaidsWon + p.totalRaidsLost;
  const winRate = raids > 0 ? Math.round((p.totalRaidsWon / raids) * 100) : 0;

  lines.push(`  ${name}'s Keep — Day ${age}`);
  lines.push(`  ${r.gold}g ${r.wood}w ${r.stone}s │ ${grid.structures.length} structures`);
  lines.push(`  ${p.totalRaidsWon}W-${p.totalRaidsLost}L (${winRate}%) │ Best streak: ${p.bestWinStreak}`);

  const verifyData = `${save.keep.id}:${raids}:${grid.structures.length}:${r.gold}`;
  const hash = Math.abs(hashSeed(verifyData)).toString(36).slice(0, 6);
  lines.push(`  #${hash}`);

  return lines.join('\n');
}
