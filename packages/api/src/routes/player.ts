import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { findPlayerById, updatePlayerLastSeen } from '@codekeep/db';
import { findKeepByPlayerId } from '@codekeep/db';
import { findProgression } from '@codekeep/db';
import type { Env } from '../app.js';

export const playerRoutes = new Hono<Env>();

playerRoutes.use('*', requireAuth);

playerRoutes.get('/', (c) => {
  const db = c.get('db');
  const playerId = c.get('playerId');
  const player = findPlayerById(db, playerId);
  if (!player) return c.json({ error: 'Player not found' }, 404);

  updatePlayerLastSeen(db, playerId);
  const keep = findKeepByPlayerId(db, playerId);
  const progression = findProgression(db, playerId);

  return c.json({
    player: {
      id: player.id,
      displayName: player.display_name,
      trophies: player.trophies,
      league: player.league,
      shieldExpiresAt: player.shield_expires_at,
      createdAt: player.created_at,
    },
    keep: keep ? {
      id: keep.id,
      name: keep.name,
      grid: JSON.parse(keep.grid_state),
      resources: JSON.parse(keep.resources),
      version: keep.version,
    } : null,
    progression: progression ? {
      totalRaidsWon: progression.total_raids_won,
      totalRaidsLost: progression.total_raids_lost,
      totalStructuresPlaced: progression.total_structures_placed,
      currentWinStreak: progression.current_win_streak,
      bestWinStreak: progression.best_win_streak,
      achievements: JSON.parse(progression.achievements),
    } : null,
  });
});
